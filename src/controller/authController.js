import User from "../models/User.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import RevokedToken from "../models/RevokedToken.js";

export async function register(req, res, next){
    try{
        const {name, email, password} = req.body;

        if(!name || !email || !password){
            return res.status(400).json({
                message_error : "obligation de tout les champs !"
            })
        }

        const emailV = email.toLowerCase();
        const findUser = await User.findOne({email : emailV});
        const selectAll = await User.find();

        let roleDefaults = "";

        if(selectAll.length === 0){
            roleDefaults = "ADMIN"
        }else{
            roleDefaults = "OPERATOR"
        }

        if(findUser){
            return res.status(400).json({
                message_error : "email deja utiliser !"
            })
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const createUser = await User.create({
            name : name,
            email : emailV,
            password : hashPassword,
            role : roleDefaults
        })

        return res.status(201).json({
            message_succes : "utilisateur est cree ...",
            user : {
                name : createUser.name,
                email : createUser.email
            }
        })

    }catch(error){
        next(error);
    }
}

export async function login(req, res, next) {
    try{

        const {email, password} = req.body

        if(!email || !password){
            return res.status(400).json({
                message_error : "obligation des chams !"
            })
        }

        const findUser = await User.findOne({email : email});

        if(!findUser){
            return res.status(400).json({
                message_error : "email ou mot de passe incorrect 1"
            })
        }

        const deHashPassword = findUser && await bcrypt.compare(password, findUser.password);

        if(!deHashPassword){
            return res.status(400).json({
                message_error : "email ou mot de passe incorrect 2"
            })
        }

        //part create jwt
        const token = jwt.sign({
            sub : findUser._id.toString()
        }, process.env.SECRET_KEY, {
            expiresIn: "1d",
            jwtid: randomUUID()
        })

        return res.status(200).json({
            message_login : "login...",
            token : token,
            info_user : {
                name : findUser.name,
                email : findUser.email
            }
        })
    }catch(error){
        next(error)
    }
}

export async function logout(req, res, next) {
    try {
        const revokedToken = { tokenHash: req.tokenHash };
        if (typeof req.user.exp === "number") {
            revokedToken.expiresAt = new Date(req.user.exp * 1000);
        }

        await RevokedToken.updateOne(
            { tokenHash: req.tokenHash },
            { $setOnInsert: revokedToken },
            { upsert: true }
        );

        return res.status(200).json({
            message_succes: "Deconnexion reussie"
        });
    } catch (error) {
        next(error);
    }
}
