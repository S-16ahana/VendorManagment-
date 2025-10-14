// src/store/rootReducer.js
import { combineReducers } from "redux";
import authReducer from "../features/auth/LoginSlice";
import vendorReducer from "../features/vendorMaster/VendorSlice";
import subcontractorReducer from "../features/subContractor/subContractorSlice";
import hiringReducer from "../features/hiring/hiringSlice";
import reportsReducer from "../features/reports/reportsSlice";
import paymentsReducer from "../features/payments/paymentSlice"; // <- new

const rootReducer = combineReducers({
  auth: authReducer,
  vendors: vendorReducer,
  subcontractor: subcontractorReducer,
  hiring: hiringReducer,
  reports: reportsReducer,
  payments: paymentsReducer, // <- added
});

export default rootReducer;
