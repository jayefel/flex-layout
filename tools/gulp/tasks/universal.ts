import {task} from 'gulp';
import {ExecTaskOptions} from '../util/task_helpers';
import {join} from 'path';
import {buildConfig, sequenceTask} from 'lib-build-tools';
import * as child_process from 'child_process';

const {packagesDir} = buildConfig;
const appDir = join(packagesDir, 'universal-app');

task('prerender', sequenceTask('prerender:pre', 'prerender:build', 'prerender:clean'));
task('prerender:pre', sequenceTask('clean', 'flex-layout:build-release', 'prerender:deps'));

task('prerender:deps', [], execTask(
  'npm', ['install'], {env: {cwd: appDir}}
));

/** Task that builds the universal-app in server mode */
task('prerender:build', execTask(
  'ng', ['build', '--prod', '--app', '1', '--output-hashing=false'],
  {env: {cwd: appDir}, failOnStderr: true}
));

task('prerender:clean', [], execTask(
  'rm', ['-rf', 'node_modules'], {
    failOnStderr: true,
    env: {
      cwd: appDir
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
