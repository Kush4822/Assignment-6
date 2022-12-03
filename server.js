/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part of this
* assignment has been copied manually or electronically from any other source (including web sites) or
* distributed to other students.
*
* Name: Kush Vinodbhai Patel Student ID: 121535215 Date: 2nd December 2022
*
* Online (Cyclic) Link: ________________________________________________________
*
********************************************************************************/ 

const express = require('express');
const blogData = require("./blog-service");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const path = require("path");
const app = express();
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');
const authData = require('./auth-service');
const clientSessions = require('client-sessions');

app.use(express.urlencoded({extended: true}));

const HTTP_PORT = process.env.PORT || 8080;

app.engine('.hbs', exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
        navLink: function(url, options) {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function(lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function(context) {
            return stripJs(context);
        }
    }
}));

app.set('view engine', '.hbs');

cloudinary.config({
    cloud_name: 'ds2hpszwo',
    api_key: '167612867611729',
    api_secret: '3Y_FwkCHbiijfxy8iqQE8MR8yV0',
    secure: true
});

const upload = multer();

app.use(express.static('public'));

app.use(clientSessions({
  cookieName: "session", 
  secret: "abcdefghijklmnopqrstuvwxyz",
  duration: 2 * 60 * 1000,
  activeDuration: 1000 * 60
}));

app.use(express.urlencoded({ extended: false }));

app.use(function(req, res, next) {
    let route = req.baseUrl + req.path;
    app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
});

app.use(function(req, res, next) {
 res.locals.session = req.session;
 next();
});

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.get('/', (req, res) => {
    res.redirect("/blog");
});

app.get('/login', (req, res) => {
    res.render(path.join(__dirname + "/views/login.hbs"));
});

app.get('/register', (req, res) => {
    res.render(path.join(__dirname + "/views/register.hbs"));
});

app.post('/register', (req, res) => {
    authData.registerUser(req.body)
    .then(() => res.render(path.join(__dirname + "/views/login.hbs"), { successMessage: "User created!" }))
    .catch(err => res.render(path.join(__dirname + "/views/register.hbs"), { errorMessage: err, userName: req.body.userName }));
});

app.post('/login', (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    authData.checkUser(req.body)
    .then(user => {
        req.session.user = {
            userName: user.userName,
            email: user.email,
            loginHistory: user.loginHistory
        };
        res.redirect('/posts');
    })
    .catch(err => res.render(path.join(__dirname + "/views/login.hbs"), { errorMessage: err, userName: req.body.userName }));
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
    res.render(path.join(__dirname + "/views/userHistory.hbs"));
});

app.get('/about', (req, res) => {
    res.render(path.join(__dirname + "/views/about.hbs"));
});

app.get('/blog', async(req, res) => {

    let viewData = {};

    try {
        let posts = [];

        if (req.query.category) {
            posts = await blogData.getPublishedPostsByCategory(req.query.category);
        } else {
            posts = await blogData.getPublishedPosts();
        }

        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

        let post = posts[0];

        viewData.posts = posts;
        viewData.post = post;

    } catch (err) {
        viewData.message = "no results";
    }

    try {
        let categories = await blogData.getCategories();

        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results"
    }

    res.render("blog", { data: viewData })

});

app.get('/blog/:id', async(req, res) => {

    let viewData = {};

    try {
        let posts = [];

        if (req.query.category) {
            posts = await blogData.getPublishedPostsByCategory(req.query.category);
        } else {
            posts = await blogData.getPublishedPosts();
        }

        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

        viewData.posts = posts;

    } catch (err) {
        viewData.message = "no results";
    }

    try {
        viewData.post = await blogData.getPostById(req.params.id);
    } catch (err) {
        viewData.message = "no results";
    }

    try {
        let categories = await blogData.getCategories();

        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results"
    }

    res.render("blog", { data: viewData })
});

app.get('/posts', ensureLogin, (req, res) => {

    let queryPromise = null;

    if (req.query.category) {
        queryPromise = blogData.getPostsByCategory(req.query.category);
    } else if (req.query.minDate) {
        queryPromise = blogData.getPostsByMinDate(req.query.minDate);
    } else {
        queryPromise = blogData.getAllPosts()
    }

    queryPromise.then(data => {
        data.length > 0 ? res.render("posts", { posts: data }) : res.render("posts", { message: "No Blog Available" }); ;
    }).catch(err => {
        res.render("posts", { user: req.session.user, layout: false, message: err });
    })

});

app.post("/posts/add", upload.single("featureImage"), (req, res) => {

    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            console.log(result);
            return result;
        }

        upload(req).then((uploaded) => {
            processPost(uploaded.url);
        });
    } else {
        processPost("");
    }

    function processPost(imageUrl) {
        req.body.featureImage = imageUrl;
        req.body.postDate = new Date().toISOString();
        blogData.addPost(req.body).then(post => {
            res.redirect("/posts");
        }).catch(err => {
            res.status(500).send(err);
        })
    }
});

app.get('/posts/add', (req, res) => {
    blogData.getCategories().then((data => {
        res.render(path.join(__dirname + "/views/addPost.hbs"), { categories: data });
    })).catch(err => {
        res.render(path.join(__dirname + "/views/addPost.hbs"), { message: err });
    });
});

app.get('/posts/:id', (req, res) => {
    blogData.getPostById(req.params.id).then(data => {
        res.json(data);
    }).catch(err => {
        res.json({ message: err });
    });
});

app.get('/categories/add', (req, res) => {
    res.render(path.join(__dirname + "/views/addCategory.hbs"))
});

app.get('/categories', (req, res) => {
    blogData.getCategories().then((data => {
        data.length > 0 ? res.render("categories", { categories: data }) : res.render("categories", { message: "No Category Available" });;
    })).catch(err => {
        res.render("categories", { message: err });
    });
});

app.post("/categories/add", (req, res) => {
    blogData.addCategory(req.body).then(category => {
        res.redirect("/categories");
    }).catch(err => {
        res.status(500).send(err);
    })
});

app.get('/categories/delete/:id', async(req, res) => {
    blogData.deleteCategoryById(req.params.id).then((data => {
        res.redirect("/categories");
    })).catch(err => {
        res.status(500).send("Unable to Remove Category / Category not found");
    });
});

app.get('/posts/delete/:id', async(req, res) => {
    blogData.deletePostById(req.params.id).then((data => {
        res.redirect("/posts");
    })).catch(err => {
        res.status(500).send("Unable to Remove Post / Post not found");
    });
});

app.use((req, res) => {
    res.status(404).render(path.join(__dirname + "/views/404.hbs"));
    res
})

blogData.initialize()
.then(authData.initialize)
.then(() => {
    app.listen(HTTP_PORT, () => {
        console.log('server listening on: ' + HTTP_PORT);
    });
}).catch((err) => {
    console.log("Unable to start a server: ", err);
})