const apiRouter = require("express").Router();
const userController = require("../controllers/user");
const adminController = require("../controllers/admin");
const { uploads } = require("../middleware/multer");
const { auth, adminAuth } = require("../middleware/auth");

apiRouter.get("/health", (req, res) => res.json({ response: "ok" }));
apiRouter.post("/api/reg", userController.reg);
apiRouter.post("/api/login", userController.login);
apiRouter.post(
  "/api/addcourse",
  auth,
  adminAuth,
  uploads.single("pimage"),
  adminController.addCourse,
);
apiRouter.delete(
  "/api/deletecourse/:id",
  auth,
  adminAuth,
  adminController.deleteCourse,
);
apiRouter.post(
  "/api/editcourse/:id",
  auth,
  adminAuth,
  uploads.single("pimage"),
  adminController.editCourse,
);
apiRouter.get("/api/getcourses", adminController.getCourses);
apiRouter.get("/api/getcourse/:id", adminController.getOneCourse);
apiRouter.get("/api/getqueries", adminController.getQueries);
apiRouter.get("/api/getquerydetails/:qid", adminController.getOneQuery);
apiRouter.delete(
  "/api/deletequery/:qid",
  auth,
  adminAuth,
  adminController.deleteQuery,
);
apiRouter.get(
  "/api/updatestatus/:qid",
  auth,
  adminAuth,
  adminController.updateQuery,
);
apiRouter.post(
  "/api/queryreply/:qid",
  auth,
  adminAuth,
  adminController.queryReply,
);
apiRouter.get("/api/checkadmin", auth, adminAuth, adminController.checkAdmin);
apiRouter.delete("/api/logout", auth, userController.logout);
apiRouter.get("/api/auth/user", auth, userController.checkUser);
apiRouter.post("/api/submitquery", userController.query);
apiRouter.post("/api/enroll", auth, userController.enroll);
apiRouter.get("/api/mycourses", auth, userController.myCourses);
apiRouter.post("/api/checkout", auth, userController.checkout);
apiRouter.post("/api/verifypayment", auth, userController.verifyPayment);

module.exports = apiRouter;
