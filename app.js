if(process.env.NODE_ENV != "producation"){
    require('dotenv').config()
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const path = require('path');
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views')) 
app.use(express.urlencoded( {extended : true}));
app.use(methodOverride('_method'));
let ejsMate = require('ejs-mate');
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,'/public')));
const ExpressError = require('./utils/ExpressError.js');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require("./models/user.js")

let dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
}

main().then(()=>{
    console.log('connected to DB')
}).catch((err)=>{
    console.log(err);
})

app.listen(8080,()=>{
    console.log('listing to port 8080');
})

const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto: {
        secret: process.env.SECRET
      },
      touchAfter : 24 * 3600,
});

const sessionOption = {
    store : store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true
    }
};



app.use(session(sessionOption));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.successMsg = req.flash('success');
    res.locals.errorMsg = req.flash('error');
    res.locals.currUser = req.user;
    
    next();
})


const categoryRoute = require('./routes/category.js')
app.use('/listing', categoryRoute); 

const listingRoute = require('./routes/listing.js')
app.use('/listing', listingRoute);

const reviewRoute = require('./routes/review.js');
app.use('/listing/:id/reviews', reviewRoute);

const userRoute = require('./routes/user.js')
app.use('/',userRoute)


//for route that didn't exist
app.all('*',(req,res,next)=> {
    next( new ExpressError(401,'Page not found'))
})

app.use((err,req,res,next)=>{
    let { StatusCode=500 , message='Some error occured' } = err;
    res.status(StatusCode).render('error.ejs',{err});
})


