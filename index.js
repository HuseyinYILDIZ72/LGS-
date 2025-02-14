const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

// Database setup
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.run("CREATE TABLE notes (id INTEGER PRIMARY KEY, user_id INTEGER, subject TEXT, content TEXT)");
    db.run("CREATE TABLE videos (id INTEGER PRIMARY KEY, user_id INTEGER, subject TEXT, url TEXT)");
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('LGS7211', salt);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['LGSHÜSEYİN', hash]);
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const subjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü'];
    res.render('dashboard', { subjects });
});

app.get('/subjects/:subject', isAuthenticated, (req, res) => {
    const subject = req.params.subject;
    db.all("SELECT * FROM notes WHERE user_id = ? AND subject = ?", [req.session.user.id, subject], (err, notes) => {
        db.all("SELECT * FROM videos WHERE user_id = ? AND subject = ?", [req.session.user.id, subject], (err, videos) => {
            res.render('subject', { subject, notes, videos });
        });
    });
});

app.post('/subjects/:subject/notes', isAuthenticated, upload.single('file'), (req, res) => {
    const subject = req.params.subject;
    const content = req.file ? req.file.filename : req.body.content;
    db.run("INSERT INTO notes (user_id, subject, content) VALUES (?, ?, ?)", [req.session.user.id, subject, content], () => {
        res.redirect(`/subjects/${subject}`);
    });
});

app.post('/subjects/:subject/videos', isAuthenticated, (req, res) => {
    const subject = req.params.subject;
    const url = req.body.url;
    db.run("INSERT INTO videos (user_id, subject, url) VALUES (?, ?, ?)", [req.session.user.id, subject, url], () => {
        res.redirect(`/subjects/${subject}`);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});