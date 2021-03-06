/*
Copyright 2016 Mozilla

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.
*/

import Immutable from 'immutable';

import { logger } from '../../../shared/logging';
import Page from '../model/page';
import Pages from '../model/pages';
import PageMeta from '../model/page-meta';
import PageState from '../model/page-state';
import SSLCertificateModel from '../model/ssl-certificate';
import PageLocalHistoryItem from '../model/page-local-history-item';
import * as UIConstants from '../constants/ui';
import * as ActionTypes from '../constants/action-types';

export default function(state = new Pages(), action) {
  switch (action.type) {
    case ActionTypes.CREATE_PAGE:
      return createPage(state, action.id, action.location, action.options);

    case ActionTypes.REMOVE_PAGE:
      return removePage(state, action.pageId);

    case ActionTypes.SET_SELECTED_PAGE:
      return setSelectedPage(state, action.pageId);

    case ActionTypes.RESET_PAGE_DATA:
      return resetPageData(state, action.pageId);

    case ActionTypes.SET_PAGE_DETAILS:
      return setPageDetails(state, action.pageId, action.pageDetails);

    case ActionTypes.SET_PAGE_META:
      return setPageMeta(state, action.pageId, action.pageMeta);

    case ActionTypes.SET_PAGE_STATE:
      return setPageState(state, action.pageId, action.pageState);

    case ActionTypes.SET_PAGE_SEARCH_VISIBILITY:
      return setPageState(state, action.pageId, { searchVisible: action.visibility });

    case ActionTypes.SET_LOCAL_PAGE_HISTORY:
      return setLocalPageHistory(state, action.pageId, action.history, action.historyIndex);

    default:
      return state;
  }
}

/* eslint-disable */
function createPage(state, id, location = UIConstants.HOME_PAGE, options = { selected: true, index: null }) {
/* eslint-enable */
  return state.withMutations(mut => {
    const page = new Page({ id, location });
    const index = options.index != null ? options.index : state.orderedIds.size;

    mut.update('orderedIds', l => l.insert(index, page.id));
    mut.update('map', m => m.set(page.id, page));

    if (options.selected) {
      mut.set('selectedId', page.id);
    }
  });
}

function removePage(state, pageId) {
  return state.withMutations(mut => {
    const pageCount = state.orderedIds.size;
    const pageIndex = state.orderedIds.findIndex(id => id === pageId);

    // Remove page first.
    mut.update('orderedIds', l => l.delete(pageIndex));
    mut.update('map', m => m.delete(pageId));

    // If the last page was removed, there's no other page remaining to select.
    // However, we won't allow states where there aren't any pages available,
    // the action creator will dispatch an action to add another page.
    if (pageCount === 1) {
      mut.set('selectedId', '');
      return;
    }

    // If we had at least two pages before removing, select the previous one
    // this isn't the first page, otherwise the next one.
    if (pageIndex === 0) {
      mut.set('selectedId', state.orderedIds.get(1));
    } else {
      mut.set('selectedId', state.orderedIds.get(pageIndex - 1));
    }
  });
}

function setSelectedPage(state, pageId) {
  return state.set('selectedId', pageId);
}

function resetPageData(state, pageId) {
  return state.withMutations(mut => {
    const fresh = new Page({ id: pageId }).entries();
    for (const [key, value] of fresh) {
      // Don't reset the `history` and `historyIndex` properties on the page.
      if (key !== 'history' && key !== 'historyIndex') {
        mut.update('map', m => m.setIn([pageId, key], value));
      }
    }
  });
}

function setPageDetails(state, pageId, pageDetails) {
  return state.withMutations(mut => {
    for (const [key, value] of Object.entries(pageDetails)) {
      if (key === 'id') {
        logger.warn('Skipping setting of `id` on page.');
        continue;
      }
      if (typeof value === 'object' && !Immutable.Iterable.isIterable(value)) {
        logger.warn(`Setting a non-immutable object \`${key}\` on page.`);
      }
      mut.update('map', m => m.setIn([pageId, key], value));
    }
  });
}

function setPageMeta(state, pageId, pageMeta) {
  return state.withMutations(mut => {
    for (const [key, value] of Object.entries(pageMeta)) {
      if (!(key in PageMeta.prototype)) {
        logger.warn(`Skipping setting of \`${key}\` on page meta.`);
        continue;
      }
      mut.update('map', m => m.setIn([pageId, 'meta', key], value));
    }
  });
}

function setPageState(state, pageId, pageState) {
  return state.withMutations(mut => {
    for (const [key, value] of Object.entries(pageState)) {
      if (!(key in PageState.prototype)) {
        logger.warn(`Skipping setting of \`${key}\` on page state.`);
        continue;
      }

      let setValue = value;

      if (key === 'certificate') {
        setValue = new SSLCertificateModel(value);
      }

      mut.update('map', m => m.setIn([pageId, 'state', key], setValue));
    }
  });
}

function setLocalPageHistory(state, pageId, history, historyIndex) {
  return state.withMutations(mut => {
    const records = history.map((location, index) => new PageLocalHistoryItem({
      uri: location,
      active: index === historyIndex,
    }));
    mut.setIn(['map', pageId, 'history'], Immutable.List(records));
    mut.setIn(['map', pageId, 'historyIndex'], historyIndex);
  });
}
