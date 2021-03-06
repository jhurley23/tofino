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

import React, { Component, PropTypes } from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import { connect } from 'react-redux';

import Style from '../../../../shared/style';
import Search from '../../../../shared/widgets/search';

import * as UIConstants from '../../../constants/ui';
import * as PagesSelectors from '../../../selectors/pages';
import * as PageActions from '../../../actions/page-actions';
import * as PageEffects from '../../../actions/page-effects';

const SEARCH_STYLE = Style.registerStyle({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: UIConstants.SEARCH_BAR_INDEX,
  borderTop: '1px solid var(--theme-window-background)',
  color: 'var(--theme-content-color)',
});

class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
  }

  componentDidMount() {
    if (this.props.isTargetPageSelected && this.props.isVisible) {
      this.searchbar.focus();
    }
  }

  componentDidUpdate() {
    if (this.props.isTargetPageSelected) {
      if (this.props.isVisible) {
        this.props.dispatch(PageEffects.performPageSearch(this.props.pageId, this.searchbar.value));
        this.searchbar.focus();
      } else {
        this.props.dispatch(PageEffects.performPageSearch(this.props.pageId, null));
        this.searchbar.blur();
      }
    }
  }

  handleInputChange = () => {
    this.props.dispatch(PageEffects.performPageSearch(this.props.pageId, this.searchbar.value));
  }

  handleInputKeyDown = e => {
    if (e.key === 'Enter') {
      this.handleInputChange(e);
    } else if (e.key === 'Escape') {
      this.props.dispatch(PageActions.hidePageSearch(this.props.pageId));
    }
  }

  render() {
    return (
      <Search ref={e => this.searchbar = e}
        id="browser-page-searchbar"
        className={SEARCH_STYLE}
        hidden={!this.props.isVisible}
        onChange={this.handleInputChange}
        onKeyDown={this.handleInputKeyDown}
        placeholder={'Search...'} />
    );
  }
}

SearchBar.displayName = 'SearchBar';

SearchBar.propTypes = {
  dispatch: PropTypes.func.isRequired,
  pageId: PropTypes.string.isRequired,
  isVisible: PropTypes.bool,
  isTargetPageSelected: PropTypes.bool,
};

function mapStateToProps(state, ownProps) {
  return {
    isVisible: PagesSelectors.getPageSearchVisible(state, ownProps.pageId),
    isTargetPageSelected: PagesSelectors.getSelectedPageId(state) === ownProps.pageId,
  };
}

export default connect(mapStateToProps)(SearchBar);
