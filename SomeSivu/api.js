const express = require("express");
const Handlebars = require("handlebars");
const crypto = require("crypto");
const cons = require("consolidate");
const path = require("path");
const app = express();
const fs = require('fs');
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require('multer');
const { Readable } = require('stream');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.set("view engine", "html");
app.use(bodyParser.json());
app.engine("html", cons.handlebars);
app.set("views", path.join(__dirname, "./Frontend/"));
const jwt = require("jsonwebtoken");

const config = require("./config.json");
const { profile } = require("console");
const { decode } = require("punycode");
const psw = config.db.password;
const usr = config.db.username;
const usr2 = config.db.username2;
const psw2 = config.db.password2;
app.use(bodyParser.urlencoded({ limit: '10mb', extended: false }));
const apiKeys = new Map();
const host = process.env.HOST || "localhost";


const transporter = nodemailer.createTransport({
  service: 'gmail', // use your email service provider
  auth: {
    user: usr2,
    pass: psw2

  }
});

//MongoDB yhteys ÄLÄ KOSKE
const uri =
  "mongodb+srv://" +
  usr +
  ":" +
  psw +
  "@somecluster.we0kdiw.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Globaali `db` muuttuja
let db;

async function main() {
  try {
    await client.connect();
    db = client.db("SomeG11");
    console.log("Yhteys MongoDB:hen onnistui.");

    // Käynnistää palvelimen, kun yhteys on varmistettu
    const port = 3000;
    app.listen(port, host, () => {
      console.log('Server running at http://' + host + ':' + port);
    });

    async function mongoQueryLogin(query) {
      try {
        const collection = db.collection("Users");
        const result = await collection.findOne(query); // Käytä findOne löytääksesi yksittäisen käyttäjän

        return result;
      } catch (error) {
        console.error("Error executing query: ", error);
      }
    }

    async function mongoInsertOne(data) {
      try {
        const collection = db.collection("Users");

        const result = await collection.insertOne(data);
        // console.log("Inserted ID: ", result.insertedId)
      } catch (error) {
        console.error("Error inserting documents:", error);
      }
    }


    // Tämä tarkoittaa, että kaikki tiedostot, jotka ovat 'Frontend' hakemistossa, ovat saatavilla
    app.use(express.static(path.join(__dirname, "Frontend")));

    // Tämä tarkoittaa, että kaikki tiedostot, jotka ovat 'Backend' hakemistossa, ovat saatavilla
    app.use("/js", express.static(path.join(__dirname, "Backend")));

    var allowCrossDomain = function (req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
      res.header("Access-Control-Allow-Headers", "Content-Type");

      next();
    };

    app.use(allowCrossDomain);

    const upload = multer({ dest: 'uploads/' });
    app.post("/image/upload", uploadWare, async (req, res) => {
      try {

        console.log('id ' + req.imageurl)
        res.status(201).json({ message: 'Image uploaded successfully' });


      } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Error uploading image' });
        return;
      }
    });

    async function uploadWare(req, res, next) {
      if (req.body.picture && req.body.hasOwnProperty('url')) {
        // If a URL is provided in the form data, set req.imageurl to the URL
        req.imageurl = req.body.url;
      }
      await upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          // Multer error handling
          return res.status(400).json({ error: 'Error uploading file', message: err.message });
        } else if (err) {
          // Other errors
          return res.status(500).json({ error: 'Server error', message: err.message });
        }
        try {
          if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
          }
          const { originalname, mimetype } = req.file;
          let imageBuffer;
          if (req.file.path) {
            imageBuffer = fs.readFileSync(req.file.path);
          } else {
            imageBuffer = req.file.buffer;
          }

          const imageCollection = db.collection('Images');
          const image = {
            name: originalname,
            image: imageBuffer,
            mimetype: mimetype
          };
          // Save image to database
          imageCollection.insertOne(image)
            .then(result => {
              req.imageurl = req.protocol + '://' + req.get('host') + '/image/' + result.insertedId; // Save the image ID to the request object
              next(); // Move to the next middleware
            })
            .catch(error => {
              console.error('Error uploading image to database:', error);
              res.status(500).json({ error: 'Error uploading image to database' });
            });
        } catch (error) {
          console.error('Error uploading image:', error);
          res.status(500).json({ error: 'Error uploading image' });
        }
      });
    }

    app.get("/image/:id", async (req, res) => {
      const { id } = req.params;

      const imageCollection = db.collection("Images");
      const result = await imageCollection.findOne({ _id: new ObjectId(id) })
      if (!result) {
        console.error("Error fetching image:", err);
        res.status(500).json({ error: "Error fetching image" });
        return;
      }

      res.set('Content-Type', result.mimetype);
      const imageStream = new Readable();
      imageStream.push(result.image.buffer);
      imageStream.push(null);
      imageStream.pipe(res);

    });


    app.post('/api/user/verify', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authorization header missing or malformed" });
      }
      let userId;
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        userId = decoded.userId;
      } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }


      const { password } = req.body;
      const usersCollection = db.collection('Users');
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.password === password) {
        return res.status(200).json({ message: "Password correct" });
      }
      return res.status(401).json({ message: "Incorrect password" });
    }
    );

    // Kun käyttäjä muuttaa tietoja /api/user/settings

  app.put('/api/user/settings', async (req, res) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authorization header missing or malformed" });
    }
    let userId;
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, 'secretKey');
      userId = decoded.userId;
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Tarkistaa onko bodyssä salasanaa ja jos on päivitä se
    if (req.body.password) {
      const { password } = req.body;

      const usersCollection = db.collection('Users');
      const result = await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { password: password } });
    }

    // Päivittää käyttäjänimen ja sähköpostin

    const { username, email } = req.body;
    const usersCollection = db.collection('Users');
    const result = await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { username: username, email: email } });
    return res.status(200).json({ message: "User info updated successfully" });
  }
  );







    // Kirjautuminen
    app.post("/api/login", async (req, res) => {
      const { username, password } = req.body;
      const user = await mongoQueryLogin({ username, password });

      if (user) {
        // Tässä luodaan JWT token. 'secretKey' pitäisi olla monimutkainen, ainutlaatuinen avain.
        //Tulevaisuudessa tämä pitäisi olla ympäristömuuttuja, joka ei ole kovakoodattu
        const token = jwt.sign(
          { userId: user._id, username: username },
          "secretKey",
          { expiresIn: "1h" }
        );

        res.json({
          status: "OK",
          message: "Login successful",
          token: token, // Lähetä luotu token takaisin käyttäjälle
        });
      } else {
        res
          .status(401)
          .json({ status: "Error", message: "Invalid username or password" });
      }
    });

    // Rekisteröi uusi käyttäjä
    app.post("/api/register", async (req, res) => {
      const username = req.body.username;
      const email = req.body.email;
      const password = req.body.password;
      const usersCollection = db.collection("Users");
      const user = await usersCollection.findOne({ username: username });
      const emailCheck = await usersCollection.findOne({ email: email })
      if (user) {
        res.status(409).json({ status: "NOT OK", message: "Username already exists" });
        return;
      }
      if (emailCheck) {
        res.status(409).json({ status: "NOT OK", message: "Email already exists" });
        return;
      }
      try {
        const data = {
          username: username,
          email: email,
          password: password,
          profile: {
            profilePicture: "",
            bio: "",
            location: "",
            joined: new Date(),
            postsCount: 0,
            friendsHidden: "public",
          },
        };

        mongoInsertOne(data);
        res.status(200).json({ status: "OK", message: "Insert successful!" });
      } catch (error) {
        res.status(500).json({ status: "NOT OK", error: error });
      }
    });

    app.get("/", (req, res) => {
      res.render("../index");
    });

    app.get("/register", (req, res) => {
      res.render("register");
    });
    app.get("/login", (req, res) => {
      res.render("login");
    });
    app.get("/feed", (req, res) => {
      res.render("someFeed");
    });
    app.get("/someFeed", (req, res) => {
      res.render("someFeed");
    });
    app.get("/profile", (req, res) => {
      res.render("profile");
    });
    app.get("/settings", (req, res) => {
      res.render("settings");
    });
    app.get("/messages", (req, res) => {
      res.render("messages");
    });
    app.get("/friends", (req, res) => {
      res.render("friends");
    });
    app.get("/login", (req, res) => {
      res.render("login");
    }
    );
    app.get("/forgot-password", (req, res) => {
      res.render("forgot-password");
    });

    app.get("/reset-password/:token", (req, res) => {
      res.render("reset-password");
    });

    function generateApiKey() {
      return crypto.randomBytes(20).toString('hex');
    }


    function isApiKeyValid(apiKey) {
      const keyData = apiKeys.get(apiKey);
      if (!keyData || keyData.expirationTime < new Date()) {
        return false; // API key not found or expired
      }
      return true; // API key is valid
    }


    app.post("/test/email", (req, res) => {
      const { email } = req.body;
      const mailOptions = {
        from: "RabbitHole Support<rabbithole.site@gmail.com>",
        to: email,
        subject: "Test email",
        text: "This is a test email from RabbitHole"
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error('Error sending email:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          console.log('Email sent:', info.response);
          res.status(200).json({ message: 'Email sent successfully' });
        }
      });
    });

    app.post('/api/password-reset-req', async (req, res) => {
      const { email } = req.body;

      const usersCollection = db.collection('Users');
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const apiKey = generateApiKey();
      const expirationTime = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24h
      apiKeys.set(apiKey, { email, expirationTime });
      const mailOptions = {
        from: 'RabbitHole Support <rabbithole.site@gmail.com',
        to: email,
        subject: 'Password reset request',
        text: 'Click the link to reset your password: \n ' + req.protocol + '://' + req.get('host') + '/reset-password/' + apiKey + '\n\nIf you did not request this, please ignore this email and your password will remain unchanged.'
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.error('Error sending email:', error);
          res.status(500).json({ error: 'Error sending email' });
          return;
        } else {
          console.log('Email sent:', info.response);
          res.status(200).json({ message: 'Password reset email sent' });
        }
      });
    });

    app.post('/api/reset-password', async (req, res) => {
      const { password, token } = req.body;

      if (!isApiKeyValid(token)) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const { email } = apiKeys.get(token);
      const usersCollection = db.collection('Users');
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const result = await usersCollection.updateOne({ email: email }, { $set: { password: password } });

      if (result.modifiedCount === 0) {
        res.status(500).json({ error: 'Error resetting password' });
        return;
      }
      apiKeys.delete(token);


      res.status(200).json({ message: 'Password reset successful' });
    });


    // Hakee postaukset
    app.get("/api/posts", async (req, res) => {
      if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
      ) {
        return res
          .status(401)
          .json({ message: "Authorization header missing or malformed" });
      }

      const token = req.headers.authorization.split(" ")[1];
      let userId;

      try {
        const decoded = jwt.verify(token, "secretKey");
        userId = decoded.userId;
      } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      try {
        const { profileId } = req.query; // otetaan vastaan query-parametri 'profileId'
        const postsCollection = db.collection("Posts");
        const usersCollection = db.collection("Users");
        const commentsCollection = db.collection("Comments");

        let postsQuery = {};
        let ownProfile = false;

        if (profileId === "own") {
          // Haetaan vain kirjautuneen käyttäjän omat postaukset
          ownProfile = true;
          postsQuery = { userId: userId };
        } else if (profileId === userId) {
          ownProfile = true;
          postsQuery = { userId: userId };
        }
        else if (profileId) {
          // Haetaan tietyn käyttäjän postaukset profileId:n perusteella
          postsQuery = { userId: profileId };
        } else {
          // Haetaan kaikki kaverien postaukset
          const friendsCollection = db.collection("Friends");
          const friendships = await friendsCollection
            .find({
              $or: [{ userID: userId }, { friendID: userId }],
              status: "hyväksytty",
            })
            .toArray();

          const friendIds = friendships.map((friendship) =>
            friendship.userID === userId
              ? friendship.friendID
              : friendship.userID
          );
          friendIds.push(userId); // Lisää käyttäjän oma ID listaan
          postsQuery = { userId: { $in: friendIds } };
        }

        // Hae kaikki postaukset, joissa userId on kaverien listalla
        const posts = await postsCollection.find(postsQuery).sort({ timestamp: -1 }).toArray();



        // Rikasta postaukset käyttäjän tiedoilla
        const postsWithUserInfo = await Promise.all(
          posts.map(async (post) => {
            const user = await usersCollection.findOne({
              _id: new ObjectId(post.userId),
            });

            if (ownProfile === true) {
              post.ownProfile = true;
            }
            else {
              post.ownProfile = false;
            }

            const comments = await commentsCollection
              .find({ postId: post._id.toString() })
              .toArray(); // Muunna ObjectId merkkijonoksi

            // Rikasta kommentit käyttäjätiedoilla
            const commentsWithUserInfo = await Promise.all(
              comments.map(async (comment) => {
                const commentUser = await usersCollection.findOne({
                  _id: new ObjectId(comment.userId),
                });
                return {
                  ...comment,
                  username: commentUser ? commentUser.username : "Anonyymi",
                  profilePicture: commentUser
                    ? commentUser.profile.profilePicture
                    : "path/to/default/profile.png",
                };
              })
            );

            return {
              ...post,
              username: user ? user.username : "Anonyymi",
              profilePicture: user
                ? user.profile.profilePicture
                : "path/to/default/profile.png",
              comments: commentsWithUserInfo,
            };
          })
        );

        // Jos oma profiili niin kaikki postauksien kommentit nähdyiksi
        if (ownProfile === true) {
          await commentsCollection.updateMany(
            { postId: { $in: posts.map((post) => post._id.toString()) } },
            { $set: { seen: true } }
          );
        }


        res.status(200).json(postsWithUserInfo);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error fetching posts" });
      }
    });


    // Hakee postauksen kommentit
    app.get("/api/posts/:postId/comments", async (req, res) => {
      const { postId } = req.params; // Otetaan postId URL-parametrista

      if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authorization header missing or malformed" });
      }

      const token = req.headers.authorization.split(" ")[1];
      try {
        jwt.verify(token, "secretKey");
      } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      try {
        const commentsCollection = db.collection("Comments");
        const usersCollection = db.collection("Users");

        // Hae kommentit, jotka kuuluvat annettuun postId:hen
        const comments = await commentsCollection.find({ postId: postId }).toArray();

        // Rikasta kommentit käyttäjän tiedoilla
        const commentsWithUserInfo = await Promise.all(comments.map(async (comment) => {
          const user = await usersCollection.findOne({ _id: new ObjectId(comment.userId) });
          return {
            ...comment,
            username: user ? user.username : "Anonyymi",
            profilePicture: user ? user.profile.profilePicture : "path/to/default/profile.png",
          };
        }));

        res.status(200).json(commentsWithUserInfo);
      } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Error fetching comments" });
      }
    });

    // Hakee käyttäjän profiilin tiedot
    app.get("/api/profile", async (req, res) => {
      let profileId = req.query.profileId; // Saadaan profileId query-parametrina

      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
      ) {
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, "secretKey");

          const usersCollection = db.collection("Users");
          let user;
          let ownProfile = false;
          let friends = "false";

          if (profileId === "own") {
            // Jos profileId on 'own', haetaan kirjautuneen käyttäjän tiedot
            ownProfile = true;
            user = await usersCollection.findOne({
              _id: new ObjectId(decoded.userId),
            });
            profileId = decoded.userId;
          } else if (profileId === decoded.userId) {
            ownProfile = true;
            user = await usersCollection.findOne({
              _id: new ObjectId(profileId),
            });
          }
          else if (profileId) {
            // Jos profileId on annettu ja se ei ole 'own', haetaan kyseisen ID:n tiedot
            user = await usersCollection.findOne({
              _id: new ObjectId(profileId),
            });
          }

          if (ownProfile === false) {
            // Tarkistaa onko kyseisen profiilin käyttäjä kaveri
            const friendsCollection = db.collection("Friends");
            // Etsitään ystävyyssuhde, jossa joko userID tai friendID vastaa decoded.userId:tä
            // ja toinen vastaa profileId:tä
            const friendship = await friendsCollection.findOne({
              $or: [
                { userID: decoded.userId, friendID: profileId },
                { userID: profileId, friendID: decoded.userId }
              ]
            });

            if (friendship && friendship.status === "hyväksytty") {
              friends = "true";
            } else if (friendship) {
              friends = "pending";
            } else {
              friends = "false";
            }
          }

          // Laskee kavereiden määrän
          const friendsCollection = db.collection("Friends");
          const friendships = await friendsCollection
            .find({
              $or: [{ userID: profileId }, { friendID: profileId }],
              status: "hyväksytty",
            })
            .toArray();


          const friendIds = friendships.map((friendship) =>
            friendship.userID === profileId
              ? friendship.friendID
              : friendship.userID
          );


          if (user && user.profile) {
            // Palautetaan käyttäjän profiilin tiedot
            res.json({
              loggedUserId: decoded.userId,
              id: user._id,
              profilePictureUrl: user.profile.profilePicture,
              username: user.username,
              bio: user.profile.bio,
              location: user.profile.location,
              joined: user.profile.joined,
              followersCount: user.profile.followersCount,
              followingCount: user.profile.followingCount,
              postsCount: user.profile.postsCount,
              ownProfile: ownProfile,
              friends: friends,
              friendsCount: friendIds.length,
              friendsHidden: user.profile.friendsHidden,
            });

          }
          else {
            // Jos käyttäjää ei löydy, palautetaan virhe
            res.status(404).json({
              error: "Käyttäjää ei löytynyt tai käyttäjäprofiili puuttuu",
            });
          }
        } catch (error) {
          // Jos tokenin validointi epäonnistuu
          console.error("Tokenin validointi epäonnistui:", error);
          res.status(401).json({ error: "Unauthorized" });
        }
      } else {
        // Jos Authorization-header puuttuu
        res.status(401).send("Authorization header is missing");
      }
    });

    // JWT tokenin avulla saa tiedot käyttäjästä
    // Hae käyttäjän tiedot
    app.get("/api/user", async (req, res) => {
      if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
      ) {
        return res
          .status(401)
          .json({ message: "Authorization header missing or malformed" });
      }

      const token = req.headers.authorization.split(" ")[1];

      try {
        // Yritä varmentaa token
        const decoded = jwt.verify(token, "secretKey");

        const usersCollection = db.collection("Users");
        const user = await usersCollection.findOne({
          _id: new ObjectId(decoded.userId),
        });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Nämä tiedot lähetetään vastauksena
        const userProfile = {
          id: user._id,
          username: user.username,
          email: user.email,
        };

        res.status(200).json(userProfile);
      } catch (error) {
        console.error("Error:", error);

        // Tarkista, liittyykö virhe vanhentuneeseen tai virheelliseen tokeniin
        if (error.name === "TokenExpiredError") {
          res.status(401).json({ message: "Token expired" });
        } else if (error.name === "JsonWebTokenError") {
          res.status(401).json({ message: "Invalid token" });
        } else {
          // Muut virheet
          res.status(500).json({
            message: "Error fetching user info",
            error: error.message,
          });
        }
      }
    });


    // Lisää uusi postaus
    app.post("/api/posts", await uploadWare, async (req, res) => {


      try {
        const token = req.headers.authorization.split(" ")[1];
        // Tarkista token ja hae käyttäjän id tokenista
        const decoded = jwt.verify(token, "secretKey");
        const userId = decoded.userId;

        const picture = req.imageurl;
        console.log('picture', picture);
        const { content } = req.body;
        if (!content) {
          return res.status(400).send("Post content is required");
        }

        // Lisää uusi postaus tietokantaan
        const newPost = {
          userId, content,
          timestamp: new Date(),
          likes: [],
          updatedAt: new Date(),
          picture: picture,
        };

        const result = await db.collection("Posts").insertOne(newPost);

        // Päivitä käyttäjän postsCount
        await db.collection("Users").updateOne(
          { _id: new ObjectId(userId) },
          { $inc: { "profile.postsCount": 1 } }
        );

        res.status(201).json(result); // Palauta vastauksena luotu postaus
      } catch (error) {
        console.error("Error:", error);
        res.status(401).send("Unauthorized: Invalid token");
      }
    });



    // Lisää kommentti postaukseen
    app.post("/api/posts/:postId/comments", async (req, res) => {
      const { postId } = req.params; // Postauksen ID URL:sta
      const { comment } = req.body; // Kommentti pyynnön rungosta
      const token = req.headers.authorization.split(" ")[1];

      try {
        const decoded = jwt.verify(token, "secretKey"); // Verifioi token
        const userId = decoded.userId; // Käyttäjän ID tokenista

        // Lisää uusi kommentti tietokantaan
        const newComment = {
          postId: postId,
          userId: userId,
          comment: comment,
          timestamp: new Date(),
          seen: false,
        };

        const commentsCollection = await db
          .collection("Comments")
          .insertOne(newComment);

        res.status(201).json({ message: "Comment added successfully" });
      } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Error adding comment" });
      }
    });


    // Hakee kaverit ja niiden tilan
    // Hakee kaikki kaverit
    app.get("/api/friends", async (req, res) => {
      if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")
      ) {
        return res
          .status(401)
          .json({ message: "Authorization header missing or malformed" });
      }

      const token = req.headers.authorization.split(" ")[1];
      let profileId = req.query.profileId; // Saadaan profileId query-parametrina

      try {
        // Tarkista ja pura token
        const decoded = jwt.verify(token, "secretKey");

        // Jos profileId on 'own', haetaan kirjautuneen käyttäjän kaverit
        if (profileId === "own") {
          profileId = decoded.userId;
        }

        // Jos profile id on tyhjä, hae kirjautuneen käyttäjän kaverit
        if (!profileId) {
          profileId = decoded.userId;
        }



        // Hae käyttäjän kaverit tietokannasta
        const friendsCollection = db.collection("Friends");
        const usersCollection = db.collection("Users");
        const friends = await friendsCollection
          .find({
            $or: [{ userID: profileId }, { friendID: profileId }],
            status: "hyväksytty",
          })
          .toArray();

        // Muodosta lista uniikeista käyttäjä-ID:istä, joita etsitään
        const userIds = friends.reduce((acc, friend) => {
          if (
            friend.userID !== profileId &&
            !acc.includes(friend.userID)
          ) {
            acc.push(friend.userID);
          }
          if (
            friend.friendID !== profileId &&
            !acc.includes(friend.friendID)
          ) {
            acc.push(friend.friendID);
          }
          return acc;
        }, []);

        // Muunna string-muodossa olevat ID:t ObjectId:ksi
        const objectIdUserIds = userIds.map((id) => new ObjectId(id));

        // Hae käyttäjätiedot käyttäjä-ID:iden perusteella
        const userDetails = await usersCollection
          .find({
            _id: { $in: objectIdUserIds },
          })
          .toArray();

        //console.log('User details:', userDetails);

        // Yhdistä kaverit ja käyttäjätiedot

        const friendsList = friends.map((friend) => {
          const friendIdString =
            friend.userID === profileId ? friend.friendID : friend.userID;
          const friendId = new ObjectId(friendIdString);
          const friendDetails = userDetails.find((user) =>
            user._id.equals(friendId)
          );
          return {
            id: friendIdString,
            name: friendDetails ? friendDetails.username : null,
            status: friend.status,
            bio: friendDetails ? friendDetails.profile.bio : null,
            location: friendDetails ? friendDetails.profile.location : null,
            profilePicture: friendDetails
              ? friendDetails.profile.profilePicture
              : null,
            postsCount: friendDetails ? friendDetails.profile.postsCount : null,
            joined: friendDetails ? friendDetails.profile.joined : null,
          };
        });

        // console.log("Friends list:", friendsList);

        res.status(200).json(friendsList);
      } catch (error) {
        if (error.name === "JsonWebTokenError") {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error("Error fetching friends:", error);
        res.status(500).json({ message: "Error fetching friends", error });
      }
    });



    // Lähettää viestin
    app.post('/api/messages', async (req, res) => {
      // Tarkista onko käyttäjä autentikoitu
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // console.log('Request body:', req.body);

      // Tarkista pyynnön runko
      if (!req.body.receiverId || !req.body.message) {
        return res.status(400).json({ message: "Receiver ID and message are required" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        // Tarkista ja pura token
        const decoded = jwt.verify(token, 'secretKey');
        const senderId = decoded.userId;

        // Luo viesti
        const newMessage = {
          senderId: senderId,
          receiverId: req.body.receiverId,
          message: req.body.message,
          createdAt: new Date(),
          seen: false,
        };

        // Tallenna viesti tietokantaan
        const messagesCollection = db.collection('PrivateMessages');
        await messagesCollection.insertOne(newMessage);

        res.status(201).json({ message: "Message sent successfully" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        // Käsittele muita virheitä
        console.error('Error sending message:', error);
        res.status(500).json({ message: "Error sending message", error });
      }
    });



    // vastaanottaa ystävän ID:n ja palauttaa viestit ystävän kanssa
    // Hae viestit ystävän kanssa
    app.get('/api/messages/:friendId', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const friendId = req.params.friendId; // Ystävän ID URL:sta
      const token = req.headers.authorization.split(' ')[1];

      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;

        // Hae viestit tietokannasta
        const messagesCollection = db.collection('PrivateMessages');
        let messages = await messagesCollection.find({
          $or: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId }
          ]
        }).sort({ createdAt: 1 }).toArray(); // Viestit järjestetään luomispäivämäärän mukaan

        // Hae käyttäjät ja yhdistä viesteihin
        const usersCollection = db.collection('Users');
        const users = await usersCollection.find({}).toArray();

        // Luo käyttäjä-ID:n ja nimen mäppäys
        const usersMap = users.reduce((map, user) => {
          map[user._id] = user.username;
          return map;
        }, {});

        // Laitaa viestit nähdyiksi
        await messagesCollection.updateMany(
          { senderId: friendId, receiverId: userId, seen: false },
          { $set: { seen: true } }
        );

        // Lisää lähettäjän nimi jokaiseen viestiin
        messages = messages.map(message => {
          return {
            ...message,
            senderName: usersMap[message.senderId], // Lisää lähettäjän nimi viestiin
          };
        });

        // console.log('Messages:', messages);

        res.json(messages);
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        // Käsittele muita virheitä
        console.error('Error retrieving messages:', error);
        res.status(500).json({ message: "Error retrieving messages", error });
      }
    });




    // Hae käyttäjät hakutermillä
    app.get('/api/users/search', async (req, res) => {
      const searchQuery = req.query.q; // Oletetaan, että hakutermi lähetetään query-parametrin 'q' kautta

      if (!searchQuery) {
        return res.status(400).json({ message: "Search query is required" });
      }

      try {
        const usersCollection = db.collection('Users');
        const regex = new RegExp(searchQuery, 'i'); // 'i' tekee hausta kirjainkoon riippumattoman

        const users = await usersCollection.find({ username: { $regex: regex } }).toArray();

        // Muunnetaan käyttäjät vastaamaan tarvittavaa ulkoasua (esim. lisätään profiililinkit)
        const modifiedUsers = users.map(user => ({
          username: user.username,
          id: user._id,
          profilePicture: user.profile.profilePicture,
        }));

        //  console.log('Modified users:', modifiedUsers);

        res.json(modifiedUsers);
      } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: "Error searching users", error });
      }
    });



    // Lisää liken postauksen like arrayhin
    // Lisää liken postaukseen
    app.post('/api/posts/:postId/like', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = new ObjectId(req.params.postId); // Muunna postId ObjectId:ksi
      const token = req.headers.authorization.split(' ')[1];

      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;

        // Lisää käyttäjän ID postauksen like-arrayhin vain, jos se ei ole jo siellä
        await db.collection('Posts').updateOne(
          { _id: postId, likes: { $ne: userId } }, // varmista, ettei userId ole jo listassa
          { $push: { likes: userId } }
        );

        const post = await db.collection('Posts').findOne({ _id: postId });
        const likesCount = post.likes.length; // Oletetaan, että likes on array

        res.status(200).json({ message: 'Like added.', likesCount: likesCount });
      } catch (error) {
        res.status(500).json({ message: 'Error adding like.' });
      }
    });


    // Poistaa liken postauksesta
    // Poistaa käyttäjän ID postauksen like-arraysta
    app.delete('/api/posts/:postId/like', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const postId = new ObjectId(req.params.postId); // Muunna postId ObjectId:ksi
      const token = req.headers.authorization.split(' ')[1];

      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;
        // Poista käyttäjän ID postauksen like-arraysta
        await db.collection('Posts').updateOne(
          { _id: postId },
          { $pull: { likes: userId } }
        );

        const post = await db.collection('Posts').findOne({ _id: postId });
        const likesCount = post.likes.length; // Oletetaan, että likes on array

        res.status(200).json({ message: 'Like removed.', likesCount: likesCount });
      } catch (error) {
        res.status(500).json({ message: 'Error removing like.' });
      }
    });


    // Postauksen päivitys
    app.put('/api/posts/:id', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      let decoded;

      try {
        decoded = jwt.verify(token, 'secretKey');
      } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const postId = req.params.id; // Postauksen ID URL:sta
      const { content } = req.body; // Päivitetty sisältö pyynnön rungosta
      const picture = req.body.picture;

      // Varmistetaan, että sisältö on toimitettu
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      try {
        const postsCollection = db.collection('Posts');
        // Varmistetaan, että käyttäjä on postauksen luoja ennen päivitystä
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
          return res.status(404).json({ message: "Post not found" });
        }

        //  console.log('Post:', post);

        if (post.userId !== decoded.userId) {
          // Käyttäjä yrittää muokata toisen käyttäjän postausta
          return res.status(403).json({ message: "You can only edit your own posts" });
        }

        // Päivitetään postaus
        await postsCollection.updateOne(
          { _id: new ObjectId(postId) },
          { $set: { content: content, updatedAt: new Date(), picture: picture } }
        );

        res.json({ message: "Post updated successfully" });
      } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: "Error updating post", error });
      }
    });

    // Poista postaus
    app.delete('/api/posts/:postId', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      let decoded;

      try {
        decoded = jwt.verify(token, 'secretKey');
      } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const postId = req.params.postId;

      const postsCollection = db.collection('Posts');
      // Varmistetaan, että käyttäjä on postauksen luoja ennen poistamista
      const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== decoded.userId) {
        // Käyttäjä yrittää poistaa toisen käyttäjän postausta
        return res.status(403).json({ message: "You can only edit your own posts" });
      }




      try {
        //Poistaa kaikki kommentit, jotka liittyvät postaukseen
        await db.collection('Comments').deleteMany({
          postId: postId
        });


        // Poista postaus tietokannasta käyttäen postId:tä
        await db.collection('Posts').deleteOne({ _id: new ObjectId(postId) });

        // Päivitä käyttäjän postsCount
        await db.collection('Users').updateOne(
          { _id: new ObjectId(decoded.userId) },
          { $inc: { "profile.postsCount": -1 } }
        );

        res.status(200).json({ message: "Post deleted successfully" });
      } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: "Error deleting post" });
      }
    });

    app.put('/api/user/profile', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;

        const { bio, location, profilePicture, friendsHidden } = req.body;
        await db.collection('Users').updateOne(
          { _id: new ObjectId(userId) },
          { $set: { "profile.bio": bio, "profile.location": location, "profile.profilePicture": profilePicture, "profile.friendsHidden": friendsHidden } }
        );

        res.status(200).json({ message: "Profile updated successfully" });
      } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: "Error updating profile", error });
      }
    });

    // POST reitti ystävän lisäämiseen
    app.post('/api/friendreq', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;
        const friendId = req.body.friendId;
        const friendsCollection = db.collection("Friends");


        // Tarkista, ettei ystävä ole jo lisätty
        const existingFriend = await friendsCollection.findOne({
          $or: [
            { userID: userId, friendID: friendId },
            { userID: friendId, friendID: userId }
          ]
        });

        if (existingFriend) {
          return res.status(400).json({ message: "Already friends or friend request pending" });
        }

        // Lisää uusi ystävä
        await friendsCollection.insertOne({
          userID: userId,
          friendID: friendId,
          status: "pending"
        });

        res.status(201).json({ message: "Friend request sent" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET-reitti hakeakseen käyttäjälle lähetetyt kaveripyynnöt sekä pyynnön lähettäjän nimen
    app.get('/api/friendreq', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;
        const friendsCollection = db.collection("Friends");
        const usersCollection = db.collection("Users");

        // Hae kaikki kaveripyynnöt, jotka on lähetetty tälle käyttäjälle ja ovat tilassa "pending"
        let friendRequests = await friendsCollection.find({
          friendID: userId,
          status: "pending"
        }).toArray();

        // Hae lisätiedot pyynnön lähettäjästä
        friendRequests = await Promise.all(friendRequests.map(async (request) => {
          const senderInfo = await usersCollection.findOne({ _id: new ObjectId(request.userID) });
          return {
            ...request,
            senderName: senderInfo ? senderInfo.username : "Unknown" // tai muu sopiva kenttä
          };
        }));

        res.status(200).json(friendRequests);
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // POST reitti ystäväpyynnön hyväksymiseen
    app.post('/api/friendreq/accept', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId; // Vastaanottajan ID
        const { senderId } = req.body; // Lähettäjän ID pyynnön rungosta

        const friendsCollection = db.collection("Friends");

        console.log('Sender ID:', senderId);
        console.log('User ID:', userId);

        // Päivitä kaveripyynnön tila "hyväksytyksi"
        const result = await friendsCollection.updateOne(
          { userID: senderId, friendID: userId, status: "pending" },
          { $set: { status: "hyväksytty" } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Friend request not found or already handled" });
        }

        res.status(200).json({ message: "Friend request accepted" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });


    // DELETE reitti ystäväpyynnön hylkäämiseen
    app.delete('/api/friendreq/reject', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId; // Vastaanottajan ID
        const { senderId } = req.body; // Lähettäjän ID pyynnön rungosta

        const friendsCollection = db.collection("Friends");

        // Poista kaveripyyntö tietokannasta
        const result = await friendsCollection.deleteOne(
          { userID: senderId, friendID: userId, status: "pending" }
        );

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Friend request not found or already handled" });
        }

        res.status(200).json({ message: "Friend request rejected" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete('/api/friends/remove', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;
        const friendId = req.body.friendId;
        const friendsCollection = db.collection("Friends");

        // console.log('Friend ID:', friendId);
        // console.log('User ID:', userId);

        // Poista kaveri tietokannasta

        const result = await friendsCollection.deleteOne({
          $or: [
            { userID: userId, friendID: friendId },
            { userID: friendId, friendID: userId }
          ],
          status: "hyväksytty"
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Friend not found" });
        }

        res.status(200).json({ message: "Friend removed" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //Hakee ilmoitukset
    app.get('/api/notifications', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;
        const friendsCollection = db.collection("Friends");
        const usersCollection = db.collection("Users");

        // Hae kaikki kaveripyynnöt, jotka on lähetetty tälle käyttäjälle ja ovat tilassa "pending"
        let friendRequests = await friendsCollection.find({
          friendID: userId,
          status: "pending"
        }).toArray();

        // Hae lisätiedot pyynnön lähettäjästä
        friendRequests = await Promise.all(friendRequests.map(async (request) => {
          const senderInfo = await usersCollection.findOne({ _id: new ObjectId(request.userID) });
          return {
            ...request,
            senderName: senderInfo ? senderInfo.username : "Unknown",
            info: "Sent you a friend request",
            type: "Friends"
          };
        }));

        // console.log('Friend requests:', friendRequests);

        // Hae kaikki käyttäjän postaukset
        const postsCollection = db.collection("Posts");
        const posts = await postsCollection.find({ userId: userId }).toArray();

        //console.log('Posts:', posts);

        // Hae kaikki kommentit joita ei ole nähty henkilön omista postauksista
        const commentsCollection = db.collection("Comments");
        let unseenComments = await commentsCollection.find({
          postId: { $in: posts.map(post => post._id.toString()) },
          seen: false
        }).toArray();



        // Hae lisätiedot kommentin lähettäjästä
        unseenComments = await Promise.all(unseenComments.map(async (comment) => {
          const senderInfo = await usersCollection.findOne({ _id: new ObjectId(comment.userId) });
          return {
            ...comment,
            senderName: senderInfo ? senderInfo.username : "Unknown",
            info: "Kommentoi postaustasi",
            type: "profile?profileId=own"
          };
        }));

        //  console.log('Unseen comments:', unseenComments);

        // Hae kaikki viestit, jotka ovat käyttäjälle näkemättömiä
        const messagesCollection = db.collection("PrivateMessages");
        let unseenMessages = await messagesCollection.find({
          receiverId: userId,
          seen: false
        }).toArray();

        // Hae lisätiedot viestin lähettäjästä

        unseenMessages = await Promise.all(unseenMessages.map(async (message) => {
          const senderInfo = await usersCollection.findOne({ _id: new ObjectId(message.senderId) });
          return {
            ...message,
            senderName: senderInfo ? senderInfo.username : "Unknown",
            info: "Sent you a message",
            type: "Friends"
          };
        }));

        res.status(200).json({ friendRequests, unseenComments, unseenMessages });

      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Poistaa kommentin
    app.delete('/api/comments/:commentId', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId; // Vastaanottajan ID
        const commentId = req.params.commentId;

        const commentsCollection = db.collection("Comments");

        // Poista kommentti tietokannasta
        const result = await commentsCollection.deleteOne({
          _id: new ObjectId(commentId),
          userId: userId
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Comment not found or you are not the author" });
        }

        res.status(200).json({ message: "Comment deleted" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Päivittää kommentin

    app.put('/api/comments/:commentId', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;
        const commentId = req.params.commentId;
        const { comment } = req.body;

        const commentsCollection = db.collection("Comments");

        // Päivitä kommentti tietokantaan
        const result = await commentsCollection.updateOne(
          { _id: new ObjectId(commentId), userId: userId },
          { $set: { comment: comment } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Comment not found or you are not the author" });
        }

        res.status(200).json({ message: "Comment updated" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });


    // Poistaa käyttäjän ja kaikki käyttäjän kaverisuhteet ja postaukset, liket, kommentit
    app.delete('/api/user', async (req, res) => {
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, 'secretKey');
        const userId = decoded.userId;

        const usersCollection = db.collection("Users");
        const friendsCollection = db.collection("Friends");
        const postsCollection = db.collection("Posts");
        const commentsCollection = db.collection("Comments");

        //Poistaa käyttäjän yksityisviestit
        await db.collection('PrivateMessages').deleteMany({
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        });

        // Poista käyttäjän kaverisuhteet
        await friendsCollection.deleteMany({
          $or: [
            { userID: userId },
            { friendID: userId }
          ]
        });

        // Poista käyttäjän postaukset
        const userPosts = await postsCollection.find({ userId: userId }).toArray();
        const postIds = userPosts.map(post => post._id.toString());
        await postsCollection.deleteMany({ userId: userId });

        // Poista kaikki postauksiin liittyvät kommentit
        await commentsCollection.deleteMany({
          postId: { $in: postIds }
        });

        // Poista käyttäjä
        await usersCollection.deleteOne({ _id: new ObjectId(userId) });

        res.status(200).json({ message: "User deleted" });
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: "Invalid token" });
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });






    //TÄMÄN YLÄPUOLELLE KAIKKI API PYYNNÖT
  } catch (error) {
    console.error("Virhe yhdistettäessä MongoDB:hen:", error);
  }
}
main().catch(console.error);
