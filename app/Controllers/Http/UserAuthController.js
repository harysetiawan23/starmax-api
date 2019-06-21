"use strict";
// VALIDATOR
const { validate } = use("Validator");

// EMAIL SERVICE
const Mail = use("Mail");

// MODELS
const User = use("App/Models/User");

// ENV
const Env = use("Env");

class UserAuthController {
  //Register User
  async register({ request, response, auth }) {
    //Validation Role
    const rules = {
      username: "required|unique:users,username",
      email: "required|email|unique:users,email",
      password:
        "required|min:6|regex:[a-z]|regex:[A-Z]|regex:[0-9]|regex:[@$!%*#?&]",
      phone: "required"
    };

    //Validation Process
    let validationProccess = await validate(request.all(), rules);

    //Validation Exceptions
    if (validationProccess.fails()) {
      let message = {
        code: 500,
        action: "register",
        status: "failed",
        data: validationProccess.messages()
      };
      return response.json(message, 200);
    }

    //Insert User to Database
    let inputData = request.all();
    inputData.id = getRandomInt(1000);
    inputData.emailValid = false;
    inputData.otpValid = false;

    let newUser = await User.create(inputData);

    //Generate a Token for User
    let userToken = await auth.generate(newUser);

    //Message for result
    let message = {
      code: 200,
      action: "register",
      status: "success",
      data: newUser,
      token: userToken
    };

    //Send Email For Verification
    let { email, username } = request.all();
    let userId = newUser.id;

    await Mail.send("emails.welcome", { username, userId }, message => {
      message.subject("STARMEX - Regristation");
      message.to(email);
    });

    return response.json(message, 200);
  }

  //Verify Email
  async verifyEmail({ params, request, response, auth }) {
    let { id } = request.get();
    let userAuth = await User.find(id);

    userAuth.emailValid = 1;

    if (!(await userAuth.save())) {
      return response.json({ message: "OTP Validation Failed" });
    }
    return response.json({ message: "OTP Validation Success" });
  }

  //Login
  async login({ params, request, auth, response, view }) {
    //Validation Role
    const rules = {
      email: "required",
      password: "required"
    };

    //Validation Process
    let validationProccess = await validate(request.all(), rules);

    //Validation Exceptions
    if (validationProccess.fails()) {
      return response.json(validationProccess.messages(), 200);
    }

    //Get email and password
    let { email, password } = request.all();

    //Attemp Login
    // try {
      if (await auth.attempt(email, password)) {
        //Get user by email
        let user = await User.findBy("email", email);

        //Check Email validation
        if (user.emailValid != 1) {
          const message = {
            code: 500,
            status: "failed",
            action: "login",
            message: "Your email doesn't verivied yet",
            action_url:
              Env.get("APP_URL") + "/api/v1/verify/email?id=" + user.id
          };
          return response.json(message, 200);
        }

        // Generate Token For User
        let token = await auth.generate(user);

        if (user.otpValid != 1) {
          var otpCode = Math.floor(1000 + Math.random() * 9000);

          user.otpCode = otpCode;
          await user.save();


          //Send OTP Password into user number

        }

        Object.assign(user, token);

        const message = {
          code: 200,
          status: "success",
          action: "login",
          data: {
            user: user
          }
        };

        return response.json(message, 200);
      }
    // } catch (e) {
    //   const message = {
    //     code: 500,
    //     status: "failed",
    //     action: "login",
    //     message: "Your email doesn't registered"
    //   };

    //   return response.json(message, 200);
    // } finally {
    // }
  }

  //Verify Phone Number Phone
  // async phoneVerifyFrom({ params, request, auth, response }) {
  //   //Check SMS OTP Validation

  //   const message = {
  //     code: 200,
  //     status: "pending",
  //     action: "verify_otp",
  //     message: "Your phone number doesn't verivied yet",
  //     action_url: Env.get("APP_URL") + "/api/v1/verify/number?id=" + user.id
  //   };

  //   return response.json(message, 200);
  // }

  // async phoneVerify({params,request,auth,response}){

  // }
}

function getRandomInt(max) {
  return 100000 + Math.floor(Math.random() * Math.floor(max));
}

module.exports = UserAuthController;
