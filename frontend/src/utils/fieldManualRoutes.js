/**
 * Routes already converted to the Field Manual look.
 *
 * The redesign ships one page group at a time. Pages still on the old dark
 * styling use white text, so rendering them on drafting paper would make them
 * unreadable. The shell and the masthead both read this list and keep the dark
 * surface for anything not yet converted.
 *
 * Add routes here as each group lands. Once it covers every route, delete this
 * module and the conditionals that use it.
 */
export const FIELD_MANUAL_ROUTES = ['/', '/discover'];

export function isFieldManualRoute(pathname) {
  return FIELD_MANUAL_ROUTES.includes(pathname);
}
