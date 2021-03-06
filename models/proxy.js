const { api, combineEffects, preventDefault, redirect } = require('../helpers')
const { animateProxies, reorderProxyRanks } = require('../effects/proxy')
const { logAddedProxy } = require('../effects/analytics')
const fetch = require('isomorphic-fetch')

module.exports = (event, state) => {
  switch (event.type) {
    case 'pageLoaded':
      switch (state.location.route) {
        case '/proxies':
          if (!state.user) return [state, redirect('/sign_in')]
          return [{
            ...state,
            location: {
              ...state.location,
              title: 'Proxies',
            },
            loading: { ...state.loading, page: true, proxies: true },
          }, fetchProxies(state.user)]
        default:
          return [state]
      }
    case 'proxy:addedProxyViaEmail':
      return [state, combineEffects([preventDefault(event.event), addProxyViaEmail(event, state.proxies, state.user), logAddedProxy])]
    case 'proxy:addedProxyViaTwitter':
      return [state, combineEffects([preventDefault(event.event), addProxyViaTwitter(event, state.proxies, state.user), logAddedProxy])]
    case 'proxy:addedProxyViaSearch':
      return [state, combineEffects([preventDefault(event.event), addProxyViaSearch(event, state.proxies, state.user), logAddedProxy])]
    case 'proxy:addedProxyViaProfile':
      return [state, combineEffects([preventDefault(event.event), addProxyViaProfile(event.profile, state.proxies, state.user), logAddedProxy])]
    case 'proxy:searched':
      return [{
        ...state,
        loading: { ...state.loading, proxySearch: true },
      }, combineEffects([preventDefault(event.event), searchProxies(event, state.user)])]
    case 'proxy:removed':
      return [state, combineEffects([preventDefault(event.event), removeProxy(event, state.cookies, state.proxies, state.user)])]
    case 'proxy:reordered':
      return [state, combineEffects([preventDefault(event.event), reorderProxies(event, state.proxies, state.user)])]
    case 'proxy:searchResultsUpdated':
      return [{
        ...state,
        loading: { ...state.loading, proxySearch: false },
        proxySearchResults: event.results,
        proxySearchTerms: event.terms,
      }]
    case 'proxy:proxiesUpdated':
      return [{
        ...state,
        loading: { ...state.loading, page: false, proxies: false },
        proxies: event.proxies,
      }]
    default:
      return [state]
  }
}

const fetchProxies = (user) => (dispatch) => {
  return api(dispatch, `/delegations_detailed?from_id=eq.${user.id}&order=delegate_rank.asc`, { user })
  .then((proxies) => dispatch({ type: 'proxy:proxiesUpdated', proxies }))
  .catch(() => dispatch({ type: 'proxy:proxiesUpdated', proxies: [] }))
}

const reorderProxies = ({ event, ...form }, proxies, user) => (dispatch) => {
  if (!form.reorder_proxies) return

  const index = form.reorder_proxies.index
  const proxy_id = form.reorder_proxies.proxy_id
  const new_index = Number(index) + (form.reorder_proxies.direction === 'up' ? (-1) : 1)

  const reordered = [].concat(proxies)
  reordered.splice(index, 1)
  reordered.splice(new_index, 0, proxies[index])
  const old_rank = proxies[index].delegate_rank
  const new_rank = proxies[new_index].delegate_rank
  const table = event.currentTarget.parentNode.parentNode.parentNode.parentNode.parentNode
  const list_elements = Array.prototype.slice.call(table.childNodes).filter(n => n.tagName === 'TR')

  animateProxies(table, list_elements)

  // send new delegate rank to API
  dispatch({ type: 'proxy:proxiesUpdated', proxies: reorderProxyRanks(reordered, reordered[new_index], old_rank, new_rank) })

  return api(dispatch, '/rpc/reorder_delegation', {
    method: 'POST',
    body: JSON.stringify({ delegation_id: proxy_id, new_rank }),
    user,
  })
}

const removeProxy = ({ id, to_id }, cookies, proxies, user) => (dispatch) => {
  const proxy = proxies.filter(d => d.id === id).pop()

  if (!window.confirm(`Are you sure you want to remove ${proxy.first_name} ${proxy.last_name}?`)) return

  proxies.forEach(d => {
    if (d.delegate_rank > proxy.delegate_rank) d.delegate_rank -= 1
  })

  return api(dispatch, `/delegations?id=eq.${id}`, {
    method: 'DELETE',
    user,
  })
  .then(() => {
    if (cookies.proxied_user_id === to_id) {
      dispatch({ type: 'cookieUnset', key: 'proxied_user_id' })
    }
    return dispatch({ type: 'proxy:proxiesUpdated', proxies: (proxies || []).filter(d => d.id !== id) })
  })
  .catch(errorHandler(dispatch))
}

const addProxyViaEmail = ({ event, ...formData }, proxies, user) => (dispatch) => {
  if (!formData.add_proxy) return

  const name = formData.add_proxy.name.trim().split(' ')

  if (name.length < 2) {
    return dispatch({ type: 'error', error: Object.assign(new Error('Please enter a first and last name'), { name: true }) })
  } else if (name.length > 5) {
    return dispatch({ type: 'error', error: Object.assign(new Error('Please enter only a first and last name'), { name: true }) })
  }

  const first_name = formData.add_proxy.name.trim().split(' ')[0]
  const last_name = formData.add_proxy.name.trim().split(' ').slice(1).join(' ')

  return api(dispatch, '/delegations', {
    method: 'POST',
    headers: { Prefer: 'return=representation' }, // returns created delegation in response
    body: JSON.stringify({
      from_id: user.id,
      first_name,
      last_name,
      email: formData.add_proxy.email ? formData.add_proxy.email.toLowerCase().trim() : null,
      delegate_rank: 0,
    }),
    user,
  })
  .then((delegations) => {
    if (event) event.target.reset()
    return api(dispatch, `/delegations_detailed?id=eq.${delegations[0].id}`, { user }).then(profiles => {
      return dispatch({
        type: 'proxy:proxiesUpdated',
        proxies: (proxies || []).concat(profiles[0] || delegations[0]),
      })
    })
  })
  .catch(errorHandler(dispatch))
}

const addProxyViaTwitter = ({ event, ...formData }, proxies, user) => (dispatch) => {
  if (!formData.add_proxy) return

  let twitter_username = null
  if (formData.add_proxy.twitter_username) {
    twitter_username = formData.add_proxy.twitter_username.trim().replace(/@/g, '')
  }

  return fetch('/rpc/twitter_username_search', {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ twitter_username }),
  })
  .then(res => {
    if (res.status === 404) {
      return res.json().then(json => {
        return Promise.reject(new Error(json.message))
      })
    }
    return res.json()
  })
  .then((twitter_user) => {
    return api(dispatch, '/delegations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' }, // returns created delegation in response
      body: JSON.stringify({
        from_id: user.id,
        twitter_username: twitter_user.twitter_username.replace(/@/g, ''),
        twitter_displayname: twitter_user.name,
        twitter_avatar: twitter_user.avatar,
        bio: twitter_user.description,
        delegate_rank: 0,
      }),
      user,
    })
    .then((newProxies) => {
      if (event) event.target.reset()
      return api(dispatch, `/delegations_detailed?id=eq.${newProxies[0].id}`, { user }).then(profiles => {
        return dispatch({
          type: 'proxy:proxiesUpdated',
          proxies: (proxies || []).concat(profiles[0] || newProxies[0]),
        })
      })
    })
  })
  .catch(errorHandler(dispatch))
}

const addProxyViaSearch = ({ event, ...formData }, proxies, user) => (dispatch) => {
  const to_id = formData.add_proxy && formData.add_proxy.to_id

  return api(dispatch, '/delegations', {
    method: 'POST',
    headers: { Prefer: 'return=representation' }, // returns created delegation in response
    body: JSON.stringify({
      from_id: user.id,
      to_id,
      delegate_rank: 0,
    }),
    user,
  })
  .then((newProxies) => {
    if (event) event.target.reset()
    return api(dispatch, `/delegations_detailed?id=eq.${newProxies[0].id}`, { user }).then(profiles => {
      return dispatch({
        type: 'proxy:proxiesUpdated',
        proxies: (proxies || []).concat(profiles[0] || newProxies[0]),
      })
    })
  })
  .catch(errorHandler(dispatch))
}

const searchProxies = ({ event, ...formData }, user) => (dispatch) => {
  const terms = formData.add_proxy && formData.add_proxy.search && formData.add_proxy.search

  if (!terms) return dispatch({ type: 'proxySearchResultsUpdated', results: [], terms })

  return api(dispatch, `/search_results_detailed?terms=fts(english).${encodeURIComponent(terms.replace(/ /g, ':* & ').replace(/$/, ':*'))}&resource_type=eq.user&limit=5`, { user })
    .then((results) => {
      return dispatch({
        type: 'proxy:searchResultsUpdated',
        results: results.filter(({ resource }) => resource.twitter_username !== 'dsernst').map(({ resource }) => resource),
        terms,
      })
    })
    .catch(error => dispatch({ type: 'error', error }))
}

const addProxyViaProfile = (profile, proxies, user) => (dispatch) => {
  // Redirect to /join if they're not logged in
  if (!user) {
    dispatch({ type: 'cookieSet', key: 'proxying_user_id', value: profile.user_id })
    dispatch({ type: 'cookieSet', key: 'proxying_username', value: (profile.username || profile.twitter_username).toLowerCase() })
    return dispatch({ type: 'redirected', url: '/join' })
  }

  if (!profile.proxied) {
    return api(dispatch, '/delegations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' }, // returns created delegation in response
      body: JSON.stringify({
        from_id: user.id,
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: null,
        username: profile.username.toLowerCase().trim(),
        delegate_rank: 0,
      }),
      user,
    })
    .then(() => dispatch({ type: 'profile:updated', profile: { ...profile, proxied: true } }))
    .then(() => api(dispatch, `/delegations_detailed?from_id=eq.${user.id}&to_id=eq.${profile.user_id}`, { user }))
    .then(([proxy]) => dispatch({ type: 'proxy:proxiesUpdated', proxies: (proxies || []).concat(proxy) }))
    .catch(errorHandler(dispatch))
  }

  return api(dispatch, `/delegations?id=eq.${profile.proxied}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }, // returns created delegation in response
    user,
  })
  .then(() => dispatch({ type: 'profile:updated', profile: { ...profile, proxied: false } }))
  .then(() => dispatch({ type: 'proxy:proxiesUpdated', proxies: proxies.filter(({ to_id }) => to_id !== profile.user_id) }))
}

const errorHandler = (dispatch) => (error) => {
  if (error.code === 42501) {
    error.name = true
    error.message = 'You cannot proxy to yourself'
  }
  if (error.code === 23514) {
    if (~error.message.indexOf('delegations_check')) {
      error.name = true
      error.message = 'You cannot proxy to yourself'
    }
    if (~error.message.indexOf('email')) {
      error.email = true
      error.message = 'Invalid email address'
    }
  }
  if (error.code === 23505) {
    error.name = true
    error.message = `You've already added them`
  }
  if (error.code === 'P0001') return dispatch({ type: 'redirected', url: '/get_started/basics?notification=proxy_wo_name' })
  dispatch({ type: 'error', error })
}
