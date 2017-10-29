import React from 'react'
import moment from 'moment'
import Alert from 'react-s-alert'
import { Link } from 'react-router-dom'
import Label from 'react-bootstrap/lib/Label'
import Form from 'react-bootstrap/lib/Form'
import FormGroup from 'react-bootstrap/lib/FormGroup'
import FormControl from 'react-bootstrap/lib/FormControl'
import ControlLabel from 'react-bootstrap/lib/ControlLabel'
import ListGroup from 'react-bootstrap/lib/ListGroup'
import Button from 'react-bootstrap/lib/Button'
import Glyphicon from 'react-bootstrap/lib/Glyphicon'
import Popover from 'react-bootstrap/lib/Popover'
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger'
import fetchJson from './utilities/fetch-json.js'
import chartDefinitions from './components/ChartDefinitions.js'
import uniq from 'lodash.uniq'
import sortBy from 'lodash.sortby'
import SqlEditor from './components/SqlEditor'

class FilterableQueryList extends React.Component {
  state = {
    queries: [],
    connections: [],
    createdBys: [],
    tags: [],
    searchInput: null,
    selectedConnection: null,
    selectedTag: null,
    selectedCreatedBy: this.props.currentUser
      ? this.props.currentUser.email
      : '',
    selectedSortBy: null,
    selectedQuery: null
  }

  handleQueryListRowMouseOver = query => {
    this.setState({ selectedQuery: query })
  }

  handleQueryDelete = queryId => {
    var queries = this.state.queries
    var selectedQuery = this.state.selectedQuery
    if (selectedQuery._id === queryId) selectedQuery = null
    queries = queries.filter(q => {
      return q._id !== queryId
    })
    this.setState({
      queries: queries,
      selectedQuery: selectedQuery
    })
    fetchJson(
      'DELETE',
      this.props.config.baseUrl + '/api/queries/' + queryId
    ).then(json => {
      if (json.error) Alert.error(json.error)
    })
  }

  loadConfigValuesFromServer = () => {
    fetchJson('GET', this.props.config.baseUrl + '/api/queries').then(json => {
      const queries = json.queries || []
      const createdBys = uniq(queries.map(q => q.createdBy))
      const tags = uniq(
        queries
          .map(q => q.tags)
          .reduce((a, b) => a.concat(b), [])
          .filter(tag => tag)
      )
      var selectedCreatedBy = this.state.selectedCreatedBy
      if (createdBys.indexOf(this.props.currentUser.email) === -1) {
        selectedCreatedBy = ''
      }
      this.setState({
        queries: json.queries,
        createdBys: createdBys,
        selectedCreatedBy: selectedCreatedBy,
        tags: tags
      })
    })
    fetchJson(
      'GET',
      this.props.config.baseUrl + '/api/connections'
    ).then(json => {
      this.setState({ connections: json.connections })
    })
  }

  onSearchChange = searchInput => {
    this.setState({
      searchInput: searchInput,
      selectedQuery: null
    })
  }

  onConnectionChange = connectionId => {
    this.setState({
      selectedConnection: connectionId,
      selectedQuery: null
    })
  }

  onTagChange = tag => {
    this.setState({
      selectedTag: tag,
      selectedQuery: null
    })
  }

  onCreatedByChange = createdBy => {
    this.setState({
      selectedCreatedBy: createdBy,
      selectedQuery: null
    })
  }

  onSortByChange = sortBy => {
    this.setState({
      selectedSortBy: sortBy
    })
  }

  componentDidMount() {
    document.title = 'SQLPad - Queries'
    this.loadConfigValuesFromServer()
  }

  render() {
    let filteredQueries = this.state.queries.map(q => q)
    if (this.state.selectedTag) {
      filteredQueries = filteredQueries.filter(q => {
        return (
          q.tags && q.tags.length && q.tags.indexOf(this.state.selectedTag) > -1
        )
      })
    }
    if (this.state.selectedCreatedBy) {
      filteredQueries = filteredQueries.filter(q => {
        return q.createdBy === this.state.selectedCreatedBy
      })
    }
    if (this.state.selectedConnection) {
      filteredQueries = filteredQueries.filter(q => {
        return q.connectionId === this.state.selectedConnection
      })
    }
    if (this.state.searchInput) {
      var terms = this.state.searchInput.split(' ')
      var termCount = terms.length
      filteredQueries = filteredQueries.filter(q => {
        var matchedCount = 0
        terms.forEach(function(term) {
          term = term.toLowerCase()
          if (
            (q.name && q.name.toLowerCase().search(term) !== -1) ||
            (q.queryText && q.queryText.toLowerCase().search(term) !== -1)
          ) {
            matchedCount++
          }
        })
        return matchedCount === termCount
      })
    }
    if (this.state.selectedSortBy === 'name') {
      filteredQueries = sortBy(filteredQueries, query =>
        query.name.toLowerCase()
      )
    } else {
      filteredQueries = sortBy(filteredQueries, 'modifiedDate').reverse()
    }

    return (
      <div className="QueryListContainer">
        <QueryListSidebar
          currentUser={this.props.currentUser}
          connections={this.state.connections}
          onConnectionChange={this.onConnectionChange}
          tags={this.state.tags}
          onSearchChange={this.onSearchChange}
          onTagChange={this.onTagChange}
          createdBys={this.state.createdBys}
          onCreatedByChange={this.onCreatedByChange}
          onSortByChange={this.onSortByChange}
          selectedCreatedBy={this.state.selectedCreatedBy}
        />
        <QueryList
          config={this.props.config}
          queries={filteredQueries}
          selectedQuery={this.state.selectedQuery}
          handleQueryDelete={this.handleQueryDelete}
          handleQueryListRowMouseOver={this.handleQueryListRowMouseOver}
        />
        <QueryPreview
          config={this.props.config}
          selectedQuery={this.state.selectedQuery}
        />
      </div>
    )
  }
}

class QueryListSidebar extends React.Component {
  onSearchChange = e => {
    this.props.onSearchChange(e.target.value)
  }

  onConnectionChange = e => {
    this.props.onConnectionChange(e.target.value)
  }

  onTagChange = e => {
    this.props.onTagChange(e.target.value)
  }

  onCreatedByChange = e => {
    this.props.onCreatedByChange(e.target.value)
  }

  onSortByChange = e => {
    this.props.onSortByChange(e.target.value)
  }

  render() {
    var connectionSelectOptions = this.props.connections.map(function(conn) {
      return (
        <option key={conn._id} value={conn._id}>
          {conn.name}
        </option>
      )
    })
    var createdBySelectOptions = this.props.createdBys.map(function(createdBy) {
      return (
        <option key={createdBy} value={createdBy}>
          {createdBy}
        </option>
      )
    })
    var tagSelectOptions = this.props.tags.map(function(tag) {
      return (
        <option key={tag} value={tag}>
          {tag}
        </option>
      )
    })
    return (
      <div className="QueryListSidebar">
        <Form>
          <FormGroup controlId="formControlsSelect">
            <ControlLabel>Search</ControlLabel>
            <FormControl type="text" onChange={this.onSearchChange} />
          </FormGroup>
          <br />
          <FormGroup controlId="formControlsSelect">
            <ControlLabel>Tag</ControlLabel>
            <FormControl componentClass="select" onChange={this.onTagChange}>
              <option value="">All</option>
              {tagSelectOptions}
            </FormControl>
          </FormGroup>
          <br />
          <FormGroup controlId="formControlsSelect">
            <ControlLabel>Connection</ControlLabel>
            <FormControl
              componentClass="select"
              onChange={this.onConnectionChange}
            >
              <option value="">All</option>
              {connectionSelectOptions}
            </FormControl>
          </FormGroup>
          <br />
          <FormGroup controlId="formControlsSelect">
            <ControlLabel>Created By</ControlLabel>
            <FormControl
              value={this.props.selectedCreatedBy}
              componentClass="select"
              onChange={this.onCreatedByChange}
            >
              <option value="">All</option>
              {createdBySelectOptions}
            </FormControl>
          </FormGroup>
          <br />
          <FormGroup controlId="formControlsSelect">
            <ControlLabel>Sort By</ControlLabel>
            <FormControl componentClass="select" onChange={this.onSortByChange}>
              <option value="modifiedDate">Modified Date</option>
              <option value="name">Name</option>
            </FormControl>
          </FormGroup>
        </Form>
      </div>
    )
  }
}

class QueryList extends React.Component {
  render() {
    var self = this
    var QueryListRows = this.props.queries.map(query => {
      return (
        <QueryListRow
          config={this.props.config}
          key={query._id}
          query={query}
          selectedQuery={this.props.selectedQuery}
          handleQueryDelete={this.props.handleQueryDelete}
          handleQueryListRowMouseOver={self.props.handleQueryListRowMouseOver}
        />
      )
    })
    return (
      <div className="QueryList">
        <ControlLabel>Queries</ControlLabel>
        <ListGroup className="QueryListContents">{QueryListRows}</ListGroup>
      </div>
    )
  }
}

class QueryListRow extends React.Component {
  state = {
    showPreview: false
  }

  onMouseOver = e => {
    this.props.handleQueryListRowMouseOver(this.props.query)
  }

  onDelete = e => {
    this.props.handleQueryDelete(this.props.query._id)
  }

  render() {
    var tagLabels = this.props.query.tags.map(tag => {
      return (
        <Label bsStyle="info" key={tag} style={{ marginLeft: 4 }}>
          {tag}
        </Label>
      )
    })
    var tableUrl =
      this.props.config.baseUrl + '/query-table/' + this.props.query._id
    var chartUrl =
      this.props.config.baseUrl + '/query-chart/' + this.props.query._id
    var selectedStyle = () => {
      if (
        this.props.selectedQuery &&
        this.props.selectedQuery._id === this.props.query._id
      ) {
        return 'list-group-item QueryListRow QueryListRowSelected'
      } else {
        return 'list-group-item QueryListRow'
      }
    }
    const popoverClick = (
      <Popover id="popover-trigger-click" title="Are you sure?">
        <Button
          bsStyle="danger"
          onClick={this.onDelete}
          style={{ width: '100%' }}
        >
          delete
        </Button>
      </Popover>
    )
    return (
      <li
        onClick={this.onClick}
        className={selectedStyle()}
        onMouseOver={this.onMouseOver}
        onMouseOut={this.onMouseOut}
      >
        <h4>
          <Link to={'/queries/' + this.props.query._id}>
            {this.props.query.name}
          </Link>
        </h4>
        <p>
          {this.props.query.createdBy} {tagLabels}
        </p>
        <p>
          <a href={tableUrl} target="_blank" rel="noopener noreferrer">
            table
          </a>{' '}
          <a href={chartUrl} target="_blank" rel="noopener noreferrer">
            chart
          </a>
        </p>
        <OverlayTrigger
          trigger="click"
          placement="left"
          container={this}
          rootClose
          overlay={popoverClick}
        >
          <a className="QueryListRowDeleteButton" href="#delete">
            <Glyphicon glyph="trash" />
          </a>
        </OverlayTrigger>
      </li>
    )
  }
}

class QueryPreview extends React.Component {
  render() {
    const { config, selectedQuery } = this.props
    if (this.props.selectedQuery) {
      const query = this.props.selectedQuery
      const chartTypeLabel = () => {
        const chartType =
          query.chartConfiguration && query.chartConfiguration.chartType
            ? query.chartConfiguration.chartType
            : null

        const chartDefinition = chartDefinitions.find(
          def => def.chartType === chartType
        )
        return chartDefinition ? (
          <h4>Chart: {chartDefinition.chartLabel}</h4>
        ) : null
      }
      return (
        <div className="QueryPreview">
          <ControlLabel>Preview</ControlLabel>
          <h4>{selectedQuery.name}</h4>
          <SqlEditor
            config={config}
            height="70%"
            readOnly
            value={selectedQuery.queryText}
          />
          {chartTypeLabel()}
          <h4>Modified: {moment(query.modifiedDate).calendar()}</h4>
          <h4>Created By: {query.createdBy}</h4>
        </div>
      )
    } else {
      return <div className="QueryPreview" />
    }
  }
}

export default FilterableQueryList
