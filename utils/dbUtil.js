import sanitize from 'string-sanitizer';
import { v4 as uuidv4 } from 'uuid';

import mongoose from "mongoose";
import userSchema from "../models/User"
import sessionSchema from "../models/UserSession"
import profilSchema from "../models/Profil"
import connectionsSchema from "../models/Connections"
import partneredSchema from "../models/partnered"

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const Profil = mongoose.model('Profil', profilSchema);
const Connection = mongoose.model('Connection', connectionsSchema);
const Partnered = mongoose.model('Partnered', partneredSchema);

function sanitizeList(stringArray) {
    return stringArray.map((str) => sanitize.sanitize(str));
}

export async function connect() {
    try {
        return await mongoose.connect('mongodb://127.0.0.1:27017/your_database_name', { // Replace with your MongoDB connection string
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

export async function createUser(ime, prezime, mail, accountType, tags=[], pfp=null) {

    if(!sanitize.validateEmail(mail)) { return {"status": 400, "message": "Invalid mail"} }

    const newUser = new User({
        ime: sanitize.sanitize(ime),
        prezime: sanitize.sanitize(prezime),
        mail: mail,
        tags: sanitizeList(tags),
        accountType: sanitize.sanitize(accountType),
        pfp: pfp // uri
    });

    await newUser.save();
    console.log('User created:', newUser);

    //Example: create a profil
    const newProfil = new Profil({
        profil_id: 1,
        title: "example profil",
        desc: "this is an example profil",
        profileType: "student",
        usr_id: newUser
    })

}



        // // Example: Create a new user
        // const newUser = new User({
        //     usr_id: 1,
        //     ime: 'John',
        //     prezime: 'Doe',
        //     accountType: 'student',
        //   });
      
        //   await newUser.save();
        //   console.log('User created:', newUser);
      
        //   //Example: create a profil
        //   const newProfil = new Profil({
        //       profil_id: 1,
        //       title: "example profil",
        //       desc: "this is an example profil",
        //       profileType: "student",
        //       usr_id:1
        //   })
      
        //   await newProfil.save();
        //   console.log("Profil created", newProfil);