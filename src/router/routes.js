const routes = [
  {
    path: '/',
    name: 'setup',
    component: () => import('pages/SetupPage.vue')
  },
  {
    path: '/play',
    name: 'play',
    component: () => import('pages/PlayPage.vue')
  },
  {
    path: '/results',
    name: 'results',
    component: () => import('pages/ResultsPage.vue')
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/'
  }
]

export default routes
