const Router = require("express")
const voucherRoute = Router();


const {  getVouchersUserSide, getWinners, freeVoucher
 } = require("../Controller/voucherController");

voucherRoute.get("/getVouchers",getVouchersUserSide);
voucherRoute.get("/getWinners",getWinners);
voucherRoute.get("/getEligibleFreeVouchers",freeVoucher);





module.exports = voucherRoute;