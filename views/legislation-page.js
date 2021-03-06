const { APP_NAME } = process.env
const { html } = require('../helpers')
const activityIndicator = require('./activity-indicator')
const stateNames = require('datasets-us-states-abbr-names')

module.exports = (state, dispatch) => {
  const { loading, measures, measuresByUrl, location } = state
  const { query, url } = location

  return html`
    <div class="section">
      <div class="container is-widescreen">
        <div class="has-text-right has-text-left-mobile">${proposeButton()}</div>
        ${filterTabs(state, dispatch)}
        ${loading.measures || !measuresByUrl[url] ? activityIndicator() :
          (!measuresByUrl[url].length ? noBillsMsg(query.order, query) : measuresByUrl[url].map((shortId) => measureListRow(measures[shortId])))}
        <style>
          .highlight-hover:hover {
            background: #f6f8fa;
          }
          .summary-tooltip {
            position: relative;
          }
          .summary-tooltip .summary-tooltip-content {
            display: none;
            position: absolute;
            max-height: 222px;
          }
          .summary-tooltip .summary-tooltip-arrow {
            display: none;
            position: absolute;
          }
          .summary-tooltip:hover .summary-tooltip-content {
            display: block;
            background: hsl(0, 0%, 100%) !important;
            box-shadow: 0px 4px 15px hsla(0, 0%, 0%, 0.15);
            border: 1px solid hsl(0, 0%, 87%);
            color: #333;
            font-size: 14px;
            overflow: hidden;
            padding: .4rem .8rem;
            text-align: left;
            white-space: normal;
            width: 400px;
            z-index: 99999;
            top: auto;
            bottom: 50%;
            left: auto;
            right: 100%;
            transform: translate(-0.5rem, 50%);
          }
          .summary-tooltip:hover .summary-tooltip-arrow {
            border-color: transparent transparent transparent hsl(0, 0%, 100%) !important;
            z-index: 99999;
            position: absolute;
            display: inline-block;
            pointer-events: none;
            border-style: solid;
            border-width: .5rem;
            margin-left: -.5rem;
            margin-top: -.5rem;
            top: 50%;
            left: -1px;
          }
          .summary-tooltip:hover .has-text-grey-lighter {
            color: hsl(0, 0%, 75%) !important;
          }
        </style>
      </div>
    </div>
  `
}

const autoSubmit = () => document.querySelector('.filter-submit').click()

const toggleDirectVotes = (cookies, dispatch) => (event) => {
  const btn = document.querySelector('.filter-submit')
  if (btn.disabled) {
    event.preventDefault()
  } else {
    if (event.currentTarget && event.currentTarget.checked) {
      dispatch({ type: 'cookieSet', key: 'hide_direct_votes', value: 'on' })
    } else {
      dispatch({ type: 'cookieUnset', key: 'hide_direct_votes' })
    }
    btn.click()
  }
}

const updateFilter = (event, location, dispatch) => {
  event.preventDefault()
  const formData = require('parse-form').parse(event.target).body
  const formUrl = `${location.path}?${Object.keys(formData).map((key) => {
    return `${key}=${formData[key]}`
  }).join('&')}`
  dispatch({ type: 'redirected', url: formUrl })
}

const filterForm = (geoip, legislatures, cookies, location, user, dispatch) => {
  const hide_direct_votes = location.query.hide_direct_votes || cookies.hide_direct_votes
  const legislatureQuery = decodeURIComponent(location.query.legislature).replace(/\+/g, ' ')

  // Add legislature from URL to legislature selection
  if (location.query.legislature && !legislatures.some(({ abbr }) => abbr === location.query.legislature)) {
    legislatures.push({
      abbr: location.query.legislature,
      name: stateNames[location.query.legislature] || location.query.legislature,
    })
  }

  return html`
    <form name="legislation_filters" class="is-inline-block" method="GET" action="/legislation" onsubmit="${(e) => updateFilter(e, location, dispatch)}">
      <input name="order" type="hidden" value="${location.query.order || 'upcoming'}" />
      <div class="field is-grouped is-grouped-right">
        <div class="${`control ${user ? '' : 'is-hidden'}`}">
          <label class="checkbox has-text-grey">
            <input onclick=${toggleDirectVotes(cookies, dispatch)} type="checkbox" name="hide_direct_votes" checked=${!!hide_direct_votes}>
            Hide voted
          </label>
        </div>
        <div class="control" style="margin-left: 10px; margin-right: 0;">
          <div class="select">
            <select autocomplete="off" name="legislature" onchange=${autoSubmit}>
              ${legislatures.map(({ abbr, name }) => {
                return html`<option value="${abbr}" selected=${abbr === legislatureQuery}>${name}</option>`
              })}
            </select>
          </div>
        </div>
        <button type="submit" class="filter-submit is-hidden">Update</button>
      </div>
      ${(!user || !user.address) && geoip ? addAddressNotification(geoip, user) : ''}
    </form>
  `
}

const addAddressNotification = (geoip = {}, user) => {
  return html`
    <p class="help">
      We guessed your location is <strong>${geoip.city}, ${geoip.regionName}.</strong><br />
      But this is only an approximation. <strong><a href="${user ? '/get_started/basics' : '/join'}">${user ? 'Go here' : 'Join'} to set your address</a></strong>.
    </p>
  `
}

const makeFilterQuery = (order, query) => {
  const newQuery = Object.assign({}, query, { order, terms: (query.terms || '') })
  return Object.keys(newQuery).filter((key) => key).map(key => {
    return `${key}=${newQuery[key]}`
  }).join('&')
}

const filterTabs = ({ geoip, legislatures, location, cookies, user }, dispatch) => {
  const { query } = location
  const orderDescriptions = {
    upcoming: 'Bills upcoming for a vote in the legislature.',
    new: 'Bills recently introduced.',
    proposed: `Bills introduced on ${APP_NAME}`,
  }

  return html`
    <div>
      <div class="tabs">
        <ul>
          <li class="${!query.order || query.order === 'upcoming' ? 'is-active' : ''}"><a href="${`/legislation?${makeFilterQuery('upcoming', query)}`}">Upcoming for vote</a></li>
          <li class="${query.order === 'new' ? 'is-active' : ''}"><a href="${`/legislation?${makeFilterQuery('new', query)}`}">Recently introduced</a></li>
          <li class="${query.order === 'proposed' ? 'is-active' : ''}"><a href="${`/legislation?${makeFilterQuery('proposed', query)}`}">Introduced on ${APP_NAME}</a></li>
        </ul>
      </div>
      <div class="columns">
        <div class="column">
          <p class="has-text-grey is-size-6">${orderDescriptions[query.order || 'upcoming']}</p>
        </div>
        <div class="column has-text-right has-text-left-mobile">
          ${filterForm(geoip, legislatures, cookies, location, user, dispatch)}
        </div>
      </div>
      <div></div>
    </div>
  `
}

const measureListRow = (s) => {
  const next_action_at = s.next_agenda_action_at || s.next_agenda_begins_at
  const measureUrl = s.author_username ? `/${s.author_username}/legislation/${s.short_id}` : `/legislation/${s.short_id}`

  return html`
    <div class="card highlight-hover">
      <div class="card-content">
        <div class="columns">
          <div class="column">
            <h3><a href="${measureUrl}">${s.title}</a></h3>
            ${s.introduced_at ? html`
            <div class="is-size-7 has-text-grey">
              <span class="has-text-weight-bold">${s.short_id.replace(/^[^-]+-(\D+)(\d+)/, '$1 $2').toUpperCase()}</span> &mdash;
              ${s.sponsor_first_name
                ? html`Introduced by&nbsp;<a href=${`/${s.sponsor_username}`}>${s.sponsor_first_name} ${s.sponsor_last_name}</a>&nbsp;on ${(new Date(s.introduced_at)).toLocaleDateString()}`
                : html`Introduced on ${(new Date(s.introduced_at)).toLocaleDateString()}`
              }
              ${s.summary ? html`
                <p class="is-hidden-tablet"><strong class="has-text-grey">Has summary</strong></p>
              ` : ''}
              <p><strong class="has-text-grey">Status:</strong>
              ${next_action_at ? html`
                Scheduled for House floor action ${!s.next_agenda_action_at ? 'during the week of' : 'on'} ${new Date(next_action_at).toLocaleDateString()}
              ` : s.status}</p>
              <p><strong class="has-text-grey">Last action:</strong> ${new Date(s.last_action_at).toLocaleDateString()}</p>
            </div>
            ` : html`
              <div class="is-size-7 has-text-grey">
                ${s.author_username
                  ? html`Authored by <a href="${`/${s.author_username}`}">${s.author_first_name} ${s.author_last_name}</a>`
                  : html`Authored by Anonymous`}
                on ${(new Date(s.created_at)).toLocaleDateString()}
              </div>
            `}
          </div>
          <div class="column is-one-quarter has-text-right-tablet has-text-left-mobile">
            ${voteButton(s)}
            ${s.summary ? summaryTooltipButton(s.id, s.short_id, s.summary) : ''}
          </div>
        </div>
      </div>
    </div>
  `
}

const votePositionClass = (position) => {
  if (position === 'yea') return 'is-success'
  if (position === 'nay') return 'is-danger'
  return ''
}

const voteButton = (s) => {
  let voteBtnTxt = 'Vote'
  let voteBtnClass = 'button is-small is-outlined is-primary'
  let voteBtnIcon = 'fas fa-edit'
  if (s.vote_position) {
    const position = `${s.vote_position[0].toUpperCase()}${s.vote_position.slice(1)}`
    if (s.vote_position === 'yea') voteBtnIcon = 'fa fa-check'
    if (s.vote_position === 'nay') voteBtnIcon = 'fa fa-times'
    if (s.vote_position === 'abstain') voteBtnIcon = 'far fa-circle'
    if (s.delegate_rank > -1) {
      if (s.delegate_name) {
        voteBtnTxt = `Inherited ${position} vote from ${s.delegate_name}`
      } else {
        voteBtnTxt = `Inherited ${position} vote from proxy`
      }
      voteBtnClass = `button is-small is-outlined ${votePositionClass(s.vote_position)}`
    }
    if (s.delegate_rank === -1) {
      voteBtnTxt = `You voted ${position}`
      voteBtnClass = `button is-small ${votePositionClass(s.vote_position)}`
    }
  }
  return html`<a style="white-space: inherit; height: auto;" class="${voteBtnClass}" href="${`/legislation/${s.short_id}`}">
    <span class="icon" style="align-self: flex-start;"><i class="${voteBtnIcon}"></i></span>
    <span class="has-text-weight-semibold">${voteBtnTxt}</span>
  </a>`
}

const proposeButton = () => html`
  <a class="button is-primary" href="/legislation/propose">
    <span class="icon"><i class="fa fa-file"></i></span>
    <span class="has-text-weight-semibold">Propose Legislation</span>
  </a>
`

const summaryTooltipButton = (id, short_id, summary) => html`
  <a href="${`/legislation/${short_id}`}" class="is-hidden-mobile">
    <br />
    <br />
    <span class="icon summary-tooltip">
      <i class="fa fa-lg fa-info-circle has-text-grey-lighter"></i>
      <div class="summary-tooltip-content">${{ html: summary }}</div>
      <div class="summary-tooltip-arrow"></div>
    </span>
  </a>
`

const noBillsMsg = (order, query) => html`
  <div>
    ${order !== 'proposed' ? html`
      <p class="is-size-5">Liquid doesn't have this location's bill list yet,
        <a href="${`/legislation?${makeQuery('proposed', query)}`}">
        click here to view manually added items.
        </a>
      </p>
    ` : html`
      <a href="/legislation/propose" class="button is-primary has-text-weight-semibold">
        <span class="icon"><i class="fa fa-file"></i></span>
        <span>Add the first policy proposal</span>
      </a>
    `}
  </div>
`

const makeQuery = (order, query) => {
  const newQuery = Object.assign({}, query, { order, terms: query.terms || '' })
  return Object.keys(newQuery).map(key => {
    return `${key}=${newQuery[key]}`
  }).join('&')
}
