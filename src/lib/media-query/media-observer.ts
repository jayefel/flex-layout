/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {filter} from 'rxjs/operators/filter';

import {MediaChange} from './media-change';
import {BreakPointRegistry} from './breakpoints/break-point-registry';
import {MatchMedia} from './match-media';
import {BreakPoint} from './breakpoints/break-point';
import {mergeAlias} from '../utils/add-alias';

@Injectable()
export class MediaObserver {

  /**
   * Should we announce gt-<xxx> breakpoint activations ?
   */
  filterOverlaps = true;

  constructor(private breakpoints: BreakPointRegistry,
              private matchMedia: MatchMedia) {
    this._registerBreakPoints();
  }

  /**
   * Test if specified query/alias is active.
   */
  isActive(alias): boolean {
    let query = this._toMediaQuery(alias);
    return this.matchMedia.isActive(query);
  }

  get media(): Observable<MediaChange> {
    const activationsOnly = (change: MediaChange) => {
      return change.matches === true;
    };
    const addAliasInformation = (change: MediaChange) => {
      return mergeAlias(change, this._findByQuery(change.mediaQuery));
    };
    const excludeOverlaps = (change: MediaChange) => {
      let bp = this._findByQuery(change.mediaQuery);
      return !bp || !(this.filterOverlaps && bp.overlapping);
    };

    return this.matchMedia.observe()
      .pipe(
        filter(activationsOnly),
        filter(excludeOverlaps),
        map(addAliasInformation)
      );
  }

  // ************************************************
  // Internal Methods
  // ************************************************

  /**
   * Register all the mediaQueries registered in the BreakPointRegistry
   * This is needed so subscribers can be auto-notified of all standard, registered
   * mediaQuery activations
   */
  private _registerBreakPoints() {
    let queries = this.breakpoints.sortedItems.map(bp => bp.mediaQuery);
    this.matchMedia.registerQuery(queries);
  }

  /**
   * Breakpoint locator by alias
   */
  private _findByAlias(alias) {
    return this.breakpoints.findByAlias(alias);
  }

  /**
   * Breakpoint locator by mediaQuery
   */
  private _findByQuery(query) {
    return this.breakpoints.findByQuery(query);
  }

  /**
   * Find associated breakpoint (if any)
   */
  private _toMediaQuery(query) {
    let bp: BreakPoint | null = this._findByAlias(query) || this._findByQuery(query);
    return bp ? bp.mediaQuery : query;
  }
}
