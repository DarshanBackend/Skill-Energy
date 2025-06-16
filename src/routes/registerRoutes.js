import express from 'express';
import {
    createRegister,
    getRegisterById,
    getAllRegister,
    updateRegister,
    deleteRegister,
    getAllUsers
} from '../controllers/registerController.js';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';
import { UserAuth, isAdmin } from '../middlewares/auth.js';

const registerRouter = express.Router();

registerRouter.post('/createRegister', createRegister);
registerRouter.get('/getRegisterById/:id', UserAuth, getRegisterById);
registerRouter.get('/getAllRegister', UserAuth, getAllRegister);
registerRouter.put('/updateRegister/:id', UserAuth, upload.single("image"), convertJfifToJpeg, updateRegister);
registerRouter.delete('/deleteRegister/:id', UserAuth, deleteRegister);


registerRouter.get('/getAllUsers', UserAuth, isAdmin, getAllUsers);


export default registerRouter;  