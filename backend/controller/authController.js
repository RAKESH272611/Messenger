const formidable = require('formidable');
const validator = require('validator');
const registerModel = require('../models/authModel');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports.userRegister = (req,res) => {

    const form = formidable();
    form.parse(req,async (err,fields,files) => {
        
       const {userName,email,password,confirmPassword} = fields;
       const {image} = files;
       const error = [];
       if(!userName){
        error.push('Please provide you user name');
       }
       if(!email){
        error.push('Please provide your email');
       }
       if(email && !validator.isEmail(email)){
        error.push('Please provide valid email');
       }
       if(!password){
        error.push('Please provide your password');
       }
       if(!confirmPassword){
        error.push('Please provide your confirm password');
       }
       if(password && confirmPassword && confirmPassword!=password){
         error.push('Your password and Confirm password not same');
       }
       if(password && password.length<6){
         error.push('Password must be 6 characters');
       }
       if(Object.keys(files).length===0){
         error.push('Please provide user image');
       }
       if(error.length>0){
          res.status(400).json({
            error:{
                 errorMessage : error
            }
          })
       }
       else{
          const getImageName = files.image.originalFilename;
          const randNumber = Math.floor(Math.random()*99999);
          const newImageName = randNumber+getImageName;
          files.image.originalFilename = newImageName;

          const newPath = __dirname+`../../../frontend/public/image/${files.image.originalFilename}`;

          try{
             const checkUser = await registerModel.findOne({
                email:email
             });
             if(checkUser){
                res.status(404).json({
                    error: {
                        errorMessage: ['Your email already exist']
                    }
                })
             }
             else{
                fs.copyFile(files.image.filepath,newPath,async(error)=>{
                    if(!error){
                        const userCreate = await registerModel.create({
                            userName,email,
                            password: await bcrypt.hash(password,10),
                            image: files.image.originalFilename
                        });
                        const token = jwt.sign({
                            id: userCreate._id,
                            email: userCreate.email,
                            userName: userCreate.userName,
                            image: userCreate.image,
                            registerName: userCreate.createdAt
                        },process.env.SECRET,{
                            expiresIn: process.env.TOKEN_EXP
                        });

    const options = {expires : new Date(Date.now()+process.env.COOKIE_EXP * 24 * 60 * 60 * 1000)}                 
    res.status(201).cookie('authToken',token,options).json({
        successMessage : 'Your registration successfull',token
    })

                    } else{
                        res.status(500).json({
                            error: {
                                errorMessage : ['Internal server Error']
                            }
                          })
                    }
                
                });
             }
    
          }catch(error){
              res.status(500).json({
                error: {
                    errorMessage : ['Internal server Error']
                }
              })
          }

       }


    }) // end Formidable

}


module.exports.userLogin = async (req,res)=>{
   const error = [];
   const {email,password} = req.body;
   if(!email){
      error.push("Please provide your Email");
   }
   if(!password){
     error.push("Please provide your password");
   }
   if(email && !validator.isEmail(email)){
     error.push("Please provide your valid email");
   }
   if(error.length>0){
      res.status(400).json({
        error:{
            errorMessage: error
        }
      })
   }
   else{
     try{
           const checkUser = await registerModel.findOne({
             email:email
           }).select('+password');
           
           if(checkUser){
             const matchPassword = await bcrypt.compare(password,checkUser.password);

           if(matchPassword){
               const token = jwt.sign({
                   id: checkUser._id,
                   email: checkUser.email,
                   userName: checkUser.userName,
                   image: checkUser.image,
                   registerName: checkUser.createdAt
                },process.env.SECRET,{
                   expiresIn: process.env.TOKEN_EXP
               });

        const options = {expires : new Date(Date.now()+process.env.COOKIE_EXP * 24 * 60 * 60 * 1000)}       
        res.status(200).cookie('authToken',token,options).json({
        successMessage : 'Your login successfull',token
        })
           }else{
             res.status(400).json({
                error:{
                    errorMessage: ['Your password not valid']
                }
             })
           }
        }else{
            res.status(400).json({
                error:{
                    errorMessage: ['Your email not found']
                }
             })
        }


     }catch{
        res.status(404).json({
            error: {
                 errorMessage : ['Internal Server Error']
            }
       })
     }
   }
}

module.exports.userLogout = (req,res) => {
  res.status(200).cookie('authToken','').json({
    success: true
  })
}