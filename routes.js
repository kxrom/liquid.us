module.exports = {
  notFound: route('Not Found', () => import('./components/NotFound')),
  '/': route(null, () => import('./components/Home')),
  '/edit_profile': route('Edit Profile', () => import('./components/EditProfilePage')),
  '/join': route('Join', () => import('./components/Join')),
  '/legislation': route('Legislation', () => import('./components/LegislationList')),
  '/legislation/propose': route('Propose New Legislation', () => import('./components/ProposeLegislationPage')),
  '/legislation/yours': route('Your Proposed Legislation', () => import('./components/YourProposedLegislationPage')),
  '/legislation/:short_id': route('Legislation', () => import('./components/MeasureDetailsPage')),
  '/legislation/:short_id/import': route('Import Vote', () => import('./components/ImportVotePage')),
  '/nominations/:short_id': route('Legislation', () => import('./components/MeasureDetailsPage')),
  '/nominations/:short_id/vote': route('Legislation', () => import('./components/MeasureVotePage')),
  '/nominations/:short_id/votes/:comment_id': route('Nomination Comment', () => import('./components/CommentPage')),
  '/:username/legislation/:short_id': route('Legislation', () => import('./components/MeasureDetailsPage')),
  '/:username/legislation/:short_id/vote': route('Legislation', () => import('./components/MeasureVotePage')),
  '/:username/legislation/:short_id/import': route('Import Vote', () => import('./components/ImportVotePage')),
  '/:username/legislation/:short_id/votes/:comment_id': route('Legislation', () => import('./components/CommentPage')),
  '/:username/legislation/:short_id/edit': route('Edit Legislation', () => import('./components/EditLegislationPage')),
  '/legislation/:short_id/vote': route('Vote', () => import('./components/MeasureVotePage')),
  '/legislation/:short_id/votes/:comment_id': route('Bill Comment', () => import('./components/CommentPage')),
  '/sign_in': route('Sign in', () => import('./components/SignIn')),
  '/sign_in/verify': route('Sign in', () => import('./components/VerifyOTP')),
  '/sign_out': route('Sign out', () => import('./components/SignOut')),
  '/settings': route('Settings', () => import('./components/Settings')),
  '/settings/unsubscribe': route('Settings', () => import('./components/SettingsUnsubscribePage')),
  '/proxies': route('Your Proxies', () => import('./components/Proxies')),
  '/jobs': route('Open Jobs', () => import('./components/JobsPage')),
  '/proxies/requests': route('Proxy Requests', () => import('./components/ProxyRequests')),
  '/drip_emails/next': route('Next introductory email', () => import('./components/DripEmailRequestNextStage')),
  '/get_started': route('Get Started', () => import('./components/get_started')),
  '/get_started/basics': route('Get Started', () => import('./components/get_started/Basics')),
  '/get_started/updates': route('Updates', () => import('./components/get_started/Updates')),
  '/get_started/proxies': route('Your First Proxy', () => import('./components/get_started/Proxies')),
  '/get_started/verification': route('Verify your identity', () => import('./components/get_started/Verify')),
  '/get_started/profile': route('Create Profile', () => import('./components/get_started/Profile')),
  '/change_address': route('Change Address', () => import('./components/ChangeAddressPage')),
  '/new_legislatures': route('New Legislatures', () => import('./components/NewLegislatures')),
  '/advocacy': route('Advocacy', () => import('./components/Advocacy')),
  '/twitter/:username': route('Profile', () => import('./components/ProfilePage')),
  '/:username': route('Profile', () => import('./components/ProfilePage')),
}

function route(page_title, fn, waitForState) {
  return { page_title, fn, waitForState }
}
