import compose from "koa-compose";
import login from "./login";
import account from "./account";
import data from "./result";

export default compose([
  data.routes(),
  data.allowedMethods(),
  login.routes(),
  login.allowedMethods(),
  account.routes(),
  account.allowedMethods,
]);
