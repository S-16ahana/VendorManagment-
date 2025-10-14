// src/store/store.js
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";

const store = configureStore({
  reducer: rootReducer,
  // optional: middleware, devTools, etc.
});

export default store;
