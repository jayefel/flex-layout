import {task} from 'gulp';
import {join} from 'path';
import {buildConfig} from '../../package-tools';

const {projectDir} = buildConfig;
const {patchTestBed} = require(join(projectDir, 'test/patch-testbed'));

/**
 *
 */
task('test:ssr', [':test:build'], (done: () => void) => {
  const jasmine = new (require('jasmine'))({projectBaseDir: projectDir});
  require('zone.js');
  require('zone.js/dist/zone-testing');
  const {TestBed} = require('@angular/core/testing');
  const {ServerTestingModule, platformServerTesting} = require('@angular/platform-server/testing');
  let testBed = TestBed.initTestEnvironment(
    ServerTestingModule,
    platformServerTesting()
  );

  patchTestBed(testBed);
  jasmine.loadConfigFile('test/jasmine-ssr.json');
  jasmine.execute();
  done();
});
