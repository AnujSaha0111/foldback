import "@testing-library/jest-dom";

// Drafts are kept in session storage; each test starts without one. Node-environment tests have no storage.
afterEach(() => {
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});
