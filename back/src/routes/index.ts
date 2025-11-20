import compose from "koa-compose";
import newsRoutes from "./routes";
import forfxReports from "./routes";
import leverage from "./routes";
import resultRoutes from "./result";
import loginRoutes from "./login";
import accountRoutes from "./account";

export default compose([
  newsRoutes.routes(),
  newsRoutes.allowedMethods(),

  forfxReports.routes(),
  forfxReports.allowedMethods(),

  leverage.routes(),
  leverage.allowedMethods(),

  resultRoutes.routes(),
  resultRoutes.allowedMethods(),

  loginRoutes.routes(),
  loginRoutes.allowedMethods(),

  accountRoutes.routes(),
  accountRoutes.allowedMethods(),
]);
