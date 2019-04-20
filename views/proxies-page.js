const { APP_NAME } = process.env
const { html } = require('../helpers')
const activityIndicator = require('./activity-indicator')
const proxiesTable = require('./proxies-table')
const proxySearch = require('./proxy-search')

// TODO fix animation
module.exports = (state, dispatch) => {
  const { loading, proxies = [], user } = state
  return html`
    <section class="section">
      <div class="container is-widescreen">
        ${user
          && user.voter_status !== 'Ineligible'
          && !user.verified
          && proxies.length > 0 ? html`
          <div class="notification">
            <span class="icon"><i class="fa fa-exclamation-triangle"></i></span>
            You haven't verified your identity yet. <strong><a href="/get_started">Finish verification</a></strong> so your proxies can represent you.
          </div>
        ` : ''}
        <div class="columns is-variable is-5">
          <div class="column">
            <h3 class="title is-5">Ajout de procurations</h3>
            ${proxySearch(state, dispatch)}
          </div>
          <div class="column">
            <h3 class="title is-5">Vos procurations</h3>
            ${proxies.length ? html`
              <p>The highest ranked gets your extra vote. If your 1st choice doesn't vote, it goes to your 2nd, then 3rd, and on.</p>
            ` : ''}
            ${loading.proxies
              ? activityIndicator()
              : proxies.length
                ? proxiesTable(state, dispatch)
                : html`
                  <div class="content">
                    <p>Vous n'avez pas encore de procurations.</p>
                    <p>
                      <span>${APP_NAME} vous permet de choisir n'importe qui pour vous représenter. Vous pouvez les modifier à tout moment, et vous pouvez toujours voter directement sur les projets de loi.</span>
                      You can change at anytime, and you can always
                      override them and vote directly on bills.
                    </p>
                    <p>Pour toute proposition sur laquelle vous ne votez pas, l'une de vos procurations obtient un vote supplémentaire. Cela garantit que votre opinion soit toujours représentée, même si vous n'avez pas le temps d'examiner toutes les questions.</p>
                  </div>
                `}
          </div>
        </div>
      </div>
    </section>
  `
}
