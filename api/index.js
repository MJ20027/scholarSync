const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcrypt');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = 'bjdbhbdbdvbdusfdjkl';

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect('mongodb+srv://user:MKsadam2002@cluster0.ndhck3b.mongodb.net/?retryWrites=true&w=majority');

app.post('/register', async (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  const {username,password} = req.body;
  try{
    const temp = await User.create({
      username,
      password:bcrypt.hashSync(password,salt),
    });
    res.json(temp);
  } catch(e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.get('/', (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  res.send('Hello, MERN stack website!');
});

app.post('/login', async (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  const {username,password} = req.body;

  const temp = await User.findOne({username});

  if (temp === null) {
    res.status(400).json('wrong username or password');
    return;
  }

  if(password===null){
    password = '';
    alert("enter correct password");
  }
  else{

    const pass = bcrypt.compareSync(password, temp.password);
    if (pass===true) {
      jwt.sign({username,id:temp._id}, secret, {}, (err,token) => {
        if (err){
           throw err;
        }else{
          res.cookie('token', token).json({
            id:temp._id,
            username,
          });
        }
      });
    } else {
      res.status(400).json('wrong username or password');
    }
  }
});

app.get('/profile', (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  const {token} = req.cookies;
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout', (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  res.cookie('token', '').json('ok');
});

app.post('/post', upload.single('file'), async (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {token} = req.cookies;

  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body;
    const val = await Post.create({ title, summary, content, cover:newPath, author:info.id, });
    res.json(val);
  });

});

app.put('/post',upload.single('file'), async (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;

    const {id,title,summary,content} = req.body;

    const val = await Post.findById(id);
    const auth = JSON.stringify(val.author) === JSON.stringify(info.id);

    if (!auth) {
      return res.status(400).json('you are not the author');
    }

    await val.update({
      title,
      // types,
      summary,
      content,
      cover: newPath ? newPath : val.cover,
    });

    res.json(val);
  });

});

app.get('/post', async (req,res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials","true");
  const {id} = req.params;
  const val = await Post.findById(id).populate('author', ['username']);
  res.json(val);
})

app.listen(4000);
