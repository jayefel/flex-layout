/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  RendererFactory2,
  InjectionToken,    // tslint:disable-line:no-unused-variable
  ComponentRef,      // tslint:disable-line:no-unused-variable
  Renderer2,
  Optional,
} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {BEFORE_APP_SERIALIZED} from '@angular/platform-server';

import {
  BreakPoint,
  BREAKPOINTS,
  CLASS_NAME,
  MatchMedia,
  RENDERER_TYPE,
  ServerStylesheet,
  SERVER_TOKEN,
} from '@angular/flex-layout';

let UNIQUE_CLASS = 0;

/**
 * create @media queries based on a virtual stylesheet
 * * Adds a unique class to each element and stores it
 *   in a shared classMap for later reuse
 */
function formatStyle(stylesheet: Map<HTMLElement, Map<string, string|number>>,
                     renderer: Renderer2,
                     mediaQuery: string,
                     classMap: Map<HTMLElement, string>) {
  let styleText = `
        @media ${mediaQuery} {`;
  stylesheet.forEach((styles, el) => {
    let className = classMap.get(el);
    if (!className) {
      className = `${CLASS_NAME}${UNIQUE_CLASS++}`;
      classMap.set(el, className);
    }
    renderer.addClass(el, className);
    styleText += `
          .${className} {`;
    styles.forEach((v, k) => {
      if (v) {
        styleText += `
              ${k}: ${v};`;
      }
    });
    styleText += `
          }`;
  });
  styleText += `
        }\n`;

  return styleText;
}

/**
 * format the static @media queries for all breakpoints
 * to be used on the server and append them to the <head>
 */
function serverStyles(renderer: Renderer2,
                      serverSheet: ServerStylesheet,
                      breakpoints: BreakPoint[],
                      matchMedia: MatchMedia,
                      _document: Document) {
  const styleTag = renderer.createElement('style');
  const classMap = new Map<HTMLElement, string>();
  const defaultStyles = new Map(serverSheet.stylesheet);
  let styleText = formatStyle(defaultStyles, renderer, 'all', classMap);

  breakpoints.reverse();
  breakpoints.forEach((bp, i) => {
    serverSheet.clearStyles();
    matchMedia.activateBreakpoint(bp);
    const stylesheet = new Map(serverSheet.stylesheet);
    if (stylesheet.size > 0) {
      styleText += formatStyle(stylesheet, renderer, bp.mediaQuery, classMap);
    }
    matchMedia.deactivateBreakpoint(breakpoints[i]);
  });

  renderer.addClass(styleTag, `${CLASS_NAME}ssr`);
  renderer.setValue(styleTag, styleText);
  renderer.appendChild(_document.head, styleTag);
}

/**
 * Add or remove static styles depending on the current
 * platform
 */
export function addStyles(serverSheet: ServerStylesheet,
                          matchMedia: MatchMedia,
                          _document: Document|null,
                          rendererFactory: RendererFactory2,
                          breakpoints: BreakPoint[]) {
  // necessary because of angular/angular/issues/14485
  const res = () => {
    if (!_document) {
      return;
    }
    const renderer = rendererFactory.createRenderer(_document, RENDERER_TYPE);
    serverStyles(renderer, serverSheet, breakpoints, matchMedia, _document);
  };

  return res;
}

/**
 *  Provider to set static styles on the server
 */
export const SERVER_PROVIDERS = [
  {
    provide: BEFORE_APP_SERIALIZED,
    useFactory: addStyles,
    deps: [
      ServerStylesheet,
      MatchMedia,
      [new Optional(), DOCUMENT],
      RendererFactory2,
      BREAKPOINTS,
    ],
    multi: true
  },
  {
    provide: SERVER_TOKEN,
    useValue: true
  }
];
