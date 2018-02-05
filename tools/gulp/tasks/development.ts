import {task} from 'gulp';
import {ExecTaskOptions} from '../util/task_helpers';
import {join} from 'path';
import {
  buildConfig, copyFiles, sequenceTask,  watchFiles
} from 'lib-build-tools';
import {flexLayoutPackage} from '../packages';
import * as child_process from 'child_process';

// These imports don't have any typings provided.
const firebaseTools = require('firebase-tools');

const {outputDir, packagesDir, projectDir} = buildConfig;

const appDir = join(packagesDir, 'demo-app');
const outDir = join(outputDir, 'packages', 'demo-app');

task(':watch:devapp', () => {
  // Custom watchers for all packages that are used inside of the demo-app. This is necessary
  // because we only want to build the changed package (using the build-no-bundles task).
   watchFiles(join(flexLayoutPackage.sourceDir, '**/!(*.scss)'), ['flex-layout:build-no-bundles']);
});

task('devapp:deps', execTask(
  'npm', ['install'],
  {env: {cwd: appDir}}
));

task('devapp:pre', sequenceTask('clean', 'flex-layout:build-release', 'devapp:deps'));

task(':serve:devapp', ['devapp:pre'], execTask(
  'ng', ['serve'],
  {env: {cwd: appDir}, failOnStderr: true}
));

task('build:devapp', ['devapp:pre'], execTask(
  'ng', ['build', '--prod'],
  {env: {cwd: appDir}, failOnStderr: true}
));

task('serve:devapp', sequenceTask([':serve:devapp', ':watch:devapp']));

/** Task that copies all vendors into the demo-app package. Allows hosting the app on firebase. */
task('stage-deploy:devapp', ['build:devapp'],
  () => copyFiles(join(appDir, 'dist', 'browser'), '**/*', outDir));

/**
 * Task that deploys the demo-app to Firebase. Firebase project will be the one that is
 * set for project directory using the Firebase CLI.
 */
task('deploy:devapp', ['stage-deploy:devapp'], () => {
  return firebaseTools.deploy({cwd: projectDir, only: 'hosting'})
    // Firebase tools opens a persistent websocket connection and the process will never exit.
    .then(() => { console.log('Successfully deployed the demo-app to firebase'); process.exit(0); })
    .catch((err: any) => { console.log(err); process.exit(1); });
});

function execTask(binPath: string, args: string[], options: ExecTaskOptions = {}) {
  return (done: (err?: string) => void) => {
    const childProcess = child_process.spawn(binPath, args, options.env);
    const stderrData: string[] = [];

    if (!options.silentStdout && !options.silent) {
      childProcess.stdout.on('data', (data: string) => process.stdout.write(data));
    }

    if (!options.silent || options.failOnStderr) {
      childProcess.stderr.on('data', (data: string) => {
        options.failOnStderr ? stderrData.push(data) : process.stderr.write(data);
      });
    }

    childProcess.on('close', (code: number) => {
      if (options.failOnStderr && stderrData.length) {
        done(stderrData.join('\n'));
      } else {
        code != 0 ? done(options.errMessage || `Process failed with code ${code}`) : done();
      }
    });
  };
}
