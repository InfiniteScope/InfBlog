const P = {
  select: '<path d="M6 3l12.5 8.6-5.6 1.2 3 5.8-2.6 1.3-3-5.9L6 17.6z" fill="currentColor" stroke="none"/>',
  node: '<circle cx="12" cy="12" r="8"/><path d="M12 8.5v7M8.5 12h7"/>',
  edge: '<circle cx="5.5" cy="17" r="2.6"/><circle cx="18.5" cy="7" r="2.6"/><path d="M8 15.2L16 8.8"/>',
  text: '<path d="M6 7V5h12v2M12 5v14M9.5 19h5"/>',
  hand: '<path d="M12 3v18M3 12h18M12 3l-2.2 2.2M12 3l2.2 2.2M12 21l-2.2-2.2M12 21l2.2-2.2M3 12l2.2-2.2M3 12l2.2 2.2M21 12l-2.2-2.2M21 12l-2.2 2.2"/>',
  undo: '<path d="M8.5 6.5L4 11l4.5 4.5M4 11h9.5a5.5 5.5 0 1 1 0 11H10"/>',
  redo: '<path d="M15.5 6.5L20 11l-4.5 4.5M20 11h-9.5a5.5 5.5 0 1 0 0 11H14"/>',
  magnet: '<path d="M7 4v7a5 5 0 0 0 10 0V4M7 4h3.5v5H7zM13.5 4H17v5h-3.5z"/>',
  arrange: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  download: '<path d="M12 4v10.5M7.5 11L12 15.5 16.5 11M5 19.5h14"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M4 16.5l4.5-4.5 4 4 2.5-2.5 5 5"/>',
  svg: '<path d="M9 8.5L5 12.5l4 4M15 8.5l4 4-4 4"/>',
  json: '<path d="M9 4.5c-2 0-2.5 1-2.5 2.5v2c0 1.5-.7 2.5-2 3 1.3.5 2 1.5 2 3v2c0 1.5.5 2.5 2.5 2.5M15 4.5c2 0 2.5 1 2.5 2.5v2c0 1.5.7 2.5 2 3-1.3.5-2 1.5-2 3v2c0 1.5-.5 2.5-2.5 2.5"/>',
  importIcon: '<path d="M12 15V4.5M8 11l4 4 4-4M5 19.5h14"/>',
  trash: '<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13M10.2 10.5v6M13.8 10.5v6"/>',
  question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.8.35-1 1-1 1.8M12 16.8h.01"/>',
  zoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="M11 8.5v5M8.5 11h5M16 16l4.5 4.5"/>',
  zoomOut: '<circle cx="11" cy="11" r="6.5"/><path d="M8.5 11h5M16 16l4.5 4.5"/>',
  fit: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  graphMode: '<circle cx="6" cy="17.5" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="18" cy="17.5" r="2.5"/><path d="M7.4 15.3l3.2-6.6M13.4 8.2l3.2 6.9M8.5 17.5h7"/>',
  digraphMode: '<circle cx="6" cy="17.5" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="18" cy="17.5" r="2.5"/><path d="M7.4 15.3l3.2-6.6M13.4 8.2l3.2 6.9M8.5 17.5h7"/><path d="M10.9 11.4l1.6-4.2-4.2 1.6z" fill="currentColor" stroke="none"/>',
  treeMode: '<circle cx="12" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M12 8.5V12M6 15.5V12h12v3.5"/>',
  stackMode: '<rect x="6" y="14.5" width="12" height="4.5" rx="1"/><rect x="6" y="9.5" width="12" height="4.5" rx="1"/><rect x="6" y="4.5" width="12" height="4.5" rx="1"/><path d="M20.5 6.5v6M20.5 12.5l-1.8-1.8M20.5 12.5l1.8-1.8" stroke-width="1.4"/>',
  queueMode: '<rect x="3.5" y="9.5" width="4.6" height="5" rx="1"/><rect x="9.7" y="9.5" width="4.6" height="5" rx="1"/><rect x="15.9" y="9.5" width="4.6" height="5" rx="1"/><path d="M21.5 12h-3M20 10.5l1.5 1.5-1.5 1.5" stroke-width="1.4"/>',
  arrayMode: '<rect x="4" y="8.5" width="16" height="7" rx="1.2"/><path d="M9.3 8.5v7M14.6 8.5v7"/>',
  save: '<path d="M5 6A2 2 0 0 1 7 4h8.5L20 8.5V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8.5 4v4.5H15V4M8 20v-6h8v6"/>',
  folderOpen: '<path d="M4 7.5V6a1.5 1.5 0 0 1 1.5-1.5H9l2 2.5h7A1.5 1.5 0 0 1 19.5 8.5v1M4 7.5h14.6a1.5 1.5 0 0 1 1.45 1.88l-1.6 6.4A2 2 0 0 1 16.5 17.3H8a2 2 0 0 1-1.94-1.52z"/>',
  eraser: '<path d="M5 19.5h14M4.5 14.5l7-7a2 2 0 0 1 2.8 0l3.7 3.7a2 2 0 0 1 0 2.8l-5 5H8.5l-4-4a2 2 0 0 1 0-.5z"/>'
}

export function icon(name) {
  const body = P[name] || P.question
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}
