import {task} from 'gulp';
import {join} from 'path';
import {buildConfig, sequenceTask} from 'lib-build-tools';
import * as child_process from 'child_process';
import {ExecTaskOptions} from '../util/task_helpers';

const {packagesDir} = buildConfig;

/** Path to the demo-app source directory. */
const demoAppSource = join(packagesDir, 'demo-app');

/** Build the demo-app and a release to confirm that the library is AOT-compatible. */
task('aot:build', sequenceTask('clean', 'flex-layout:build-release', 'aot:run'));
task('aot:run', sequenceTask('aot:deps', 'aot:cli', 'aot:clean'));

task('aot:deps', [], execTask(
  'npm', ['install'], {env: {cwd: demoAppSource}}
));

/** Task that builds the universal-app in server mode */
task('aot:cli', execTask(
  'ng', ['build', '--prod'],
  {env: {cwd: demoAppSource}, failOnStderr: true}
));

task('aot:clean', [], execTask(
  'rm', ['-rf', 'node_modules'], {
    failOnStderr: true,
    env: {
      cwd: demoAppSource
    }
  }
));


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
