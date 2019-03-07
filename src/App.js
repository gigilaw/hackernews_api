import React, { Component } from 'react'
import './App.css'
import axios from 'axios'
import { sortBy } from 'lodash'

const DEFAULT_QUERY = 'redux'
const DEFAULT_HPP = '100'
const PATH_BASE = 'http://hn.algolia.com/api/v1'
const PATH_SEARCH = '/search'
const PARAM_SEARCH = 'query='
const PARAM_PAGE = 'page='
const PARAM_HPP = 'hitsPerPage='

const SORTS = {
	NONE: list => list,
	TITLE: list => sortBy(list, 'title'),
	AUTHOR: list => sortBy(list, 'author'),
	COMMENTS: list => sortBy(list, 'num_comments').reverse(),
	POINTS: list => sortBy(list, 'points').reverse(),
}

class App extends Component {
	constructor(props) {
		super(props)
		this.state = {
			results: null,
			searchKey: '',
			searchTerm: DEFAULT_QUERY,
			error: null,
			isLoading: false,
			sortKey: 'NONE',
			isSortReverse: false,
		}
		this.needsToSearchTopStories = this.needsToSearchTopStories.bind(this)
		this.setSearchTopStories = this.setSearchTopStories.bind(this)
		this.fetchSearchTopStories = this.fetchSearchTopStories.bind(this)
		this.onSearchChange = this.onSearchChange.bind(this)
		this.onSearchSubmit = this.onSearchSubmit.bind(this)
		this.onDismiss = this.onDismiss.bind(this)
		this.onSort = this.onSort.bind(this)
	}

	needsToSearchTopStories(searchTerm) {
		return !this.state.results[searchTerm]
	}
	setSearchTopStories(result) {
		const { hits, page } = result
		const { searchKey, results } = this.state
		const oldHits = results && results[searchKey] ? results[searchKey].hits : []
		const updatedHits = [...oldHits, ...hits]
		this.setState({
			results: { ...results, [searchKey]: { hits: updatedHits, page } },
			isLoading: false,
		})
	}
	fetchSearchTopStories(searchTerm, page = 0) {
		this.setState({ isLoading: true })
		axios(
			`${PATH_BASE}${PATH_SEARCH}?${PARAM_SEARCH}${searchTerm}&${PARAM_PAGE}${page}&${PARAM_HPP}${DEFAULT_HPP}`,
		)
			.then(result => this.setSearchTopStories(result.data))
			.catch(error => this.setState({ error }))
	}
	componentDidMount() {
		const { searchTerm } = this.state
		this.setState({ searchKey: searchTerm })
		this.fetchSearchTopStories(searchTerm)
	}
	onSearchChange(event) {
		this.setState({ searchTerm: event.target.value })
	}
	onDismiss(id) {
		const { searchKey, results } = this.state
		const { hits, page } = results[searchKey]
		const isNotId = item => item.objectID !== id
		const updatedHits = hits.filter(isNotId)
		this.setState({
			results: { ...results, [searchKey]: { hits: updatedHits, page } },
		})
	}
	onSearchSubmit(event) {
		const { searchTerm } = this.state
		this.setState({ searchKey: searchTerm })
		if (this.needsToSearchTopStories(searchTerm)) {
			this.fetchSearchTopStories(searchTerm)
		}
		event.preventDefault()
	}

	onSort(sortKey) {
		const isSortReverse =
			this.state.sortKey === sortKey && !this.state.isSortReverse
		this.setState({ sortKey, isSortReverse })
	}

	render() {
		const {
			searchTerm,
			results,
			searchKey,
			error,
			isLoading,
			sortKey,
			isSortReverse,
		} = this.state
		const page = (results && results[searchKey] && results[searchKey].page) || 0
		const list =
			(results && results[searchKey] && results[searchKey].hits) || []

		if (error) {
			return <p>Something went wrong.</p>
		}

		return (
			<div className="page">
				<div className="interactions">
					<Search
						value={searchTerm}
						onChange={this.onSearchChange}
						onSubmit={this.onSearchSubmit}
					>
						Search
					</Search>
				</div>
				<Table
					list={list}
					onDismiss={this.onDismiss}
					sortKey={sortKey}
					onSort={this.onSort}
					isSortReverse={isSortReverse}
				/>
				<div className="interactions">
					<ButtonWithLoading
						isLoading={isLoading}
						onClick={() => this.fetchSearchTopStories(searchKey, page + 1)}
					>
						More
					</ButtonWithLoading>
				</div>
			</div>
		)
	}
}

class Search extends Component {
	componentDidMount() {
		if (this.input) {
			this.input.focus()
		}
	}
	render() {
		const { value, onChange, children, onSubmit } = this.props
		return (
			<form onSubmit={onSubmit}>
				<input
					type="text"
					value={value}
					onChange={onChange}
					ref={el => (this.input = el)}
				/>
				<button type="submit">{children}</button>
			</form>
		)
	}
}

const Table = ({ list, sortKey, onSort, onDismiss, isSortReverse }) => {
	const sortedList = SORTS[sortKey](list)
	const reverseSortedList = isSortReverse ? sortedList.reverse() : sortedList
	return (
		<div className="table">
			<div className="table-header">
				<span>
					<Sort sortKey={'TITLE'} onSort={onSort} activeSortKey={sortKey}>
						Title
					</Sort>
				</span>
				<span>
					<Sort sortKey={'AUTHOR'} onSort={onSort} activeSortKey={sortKey}>
						Author
					</Sort>
				</span>
				<span>
					<Sort sortKey={'COMMENTS'} onSort={onSort} activeSortKey={sortKey}>
						Comments
					</Sort>
				</span>
				<span>
					<Sort sortKey={'POINTS'} onSort={onSort} activeSortKey={sortKey}>
						Points
					</Sort>
				</span>
				<span>Archive</span>
			</div>
			{reverseSortedList.map(item => (
				<div key={item.objectID} className="table-row">
					<span>
						<a href={item.url}>{item.title}</a>
					</span>
					<span>{item.author}</span>
					<span>{item.num_comments}</span>
					<span>{item.points}</span>
					<span>
						<Button
							onClick={() => onDismiss(item.objectID)}
							className="button-inline"
						>
							Dismiss
						</Button>
					</span>
				</div>
			))}
		</div>
	)
}

const Button = ({ onClick, className = '', children }) => {
	return (
		<button onClick={onClick} className={className} type="button">
			{' '}
			{children}
		</button>
	)
}

const Loading = () => <div>Loading...</div>

const withLoading = Component => ({ isLoading, ...rest }) =>
	isLoading ? <Loading /> : <Component {...rest} />

const ButtonWithLoading = withLoading(Button)

const Sort = ({ sortKey, onSort, children, activeSortKey }) => {
	const sortClass = ['button-inline']
	if (sortKey === activeSortKey) {
		sortClass.push('button-active')
	}
	return (
		<Button onClick={() => onSort(sortKey)} className={sortClass.join(' ')}>
			{children}
		</Button>
	)
}

export default App
