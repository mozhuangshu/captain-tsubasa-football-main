export function prefersHandheld(nav=navigator,media=matchMedia){
 // Screen width and optional touchscreens do not make a desktop a phone.
 return /Android|iPhone|iPad|iPod/i.test(nav.userAgent)
  || (nav.platform==='MacIntel'&&nav.maxTouchPoints>1)
  || media('(pointer: coarse) and (hover: none)').matches;
}
