const express = require("express");
const Handlebars = require("handlebars");
var cons = require("consolidate");
var path = require("path");
const app = express();
var bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.set("view engine", "html");
app.use(bodyParser.json());
app.engine("html", cons.handlebars);
app.set("views", path.join(__dirname, "./Frontend/"));
const jwt = require("jsonwebtoken");

const config = require("./config.json");
const psw = config.db.password;
const usr = config.db.username;
app.use(bodyParser.urlencoded({ extended: false }));

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
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
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
      const password = req.body.password; // HUOM: Tämän pitäisi olla hashattu turvallisuussyistä

      try {
        const data = {
          username: username,
          email: email,
          password: password, // Myös tämä pitäisi olla hashattu
          profile: {
            profilePicture: "",
            bio: "",
            location: "",
            joined: new Date(),
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
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

        if (profileId === "own") {
          // Haetaan vain kirjautuneen käyttäjän omat postaukset
          postsQuery = { userId: userId };
        } else if (profileId) {
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
        const posts = await postsCollection.find(postsQuery).sort({timestamp: -1}).toArray();


        // Rikasta postaukset käyttäjän tiedoilla
        const postsWithUserInfo = await Promise.all(
          posts.map(async (post) => {
            const user = await usersCollection.findOne({
              _id: new ObjectId(post.userId),
            });
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
      const profileId = req.query.profileId; // Saadaan profileId query-parametrina

      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
      ) {
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, "secretKey");

          const usersCollection = db.collection("Users");
          let user;

          if (profileId === "own") {
            // Jos profileId on 'own', haetaan kirjautuneen käyttäjän tiedot
            user = await usersCollection.findOne({
              _id: new ObjectId(decoded.userId),
            });
          } else if (profileId) {
            // Jos profileId on annettu ja se ei ole 'own', haetaan kyseisen ID:n tiedot
            user = await usersCollection.findOne({
              _id: new ObjectId(profileId),
            });
          }

          if (user && user.profile) {
            // Palautetaan käyttäjän profiilin tiedot
            res.json({
              profilePictureUrl: user.profile.profilePicture,
              username: user.username,
              bio: user.profile.bio,
              location: user.profile.location,
              joined: user.profile.joined,
              followersCount: user.profile.followersCount,
              followingCount: user.profile.followingCount,
              postsCount: user.profile.postsCount,
            });
          } else {
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
    app.post("/api/posts", async (req, res) => {
      const token = req.headers.authorization.split(" ")[1];

      try {
        // Tarkista token ja hae käyttäjän id tokenista
        const decoded = jwt.verify(token, "secretKey");
        const userId = decoded.userId;

        const { content } = req.body;
        if (!content) {
          return res.status(400).send("Post content is required");
        }

        // Lisää uusi postaus tietokantaan
        const newPost = { userId, content, timestamp: new Date(), likes: []};
        const result = await db.collection("Posts").insertOne(newPost);

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

      try {
        // Tarkista ja pura token
        const decoded = jwt.verify(token, "secretKey");

        // Hae käyttäjän kaverit tietokannasta
        const friendsCollection = db.collection("Friends");
        const usersCollection = db.collection("Users");
        const friends = await friendsCollection
          .find({
            $or: [{ userID: decoded.userId }, { friendID: decoded.userId }],
            status: "hyväksytty",
          })
          .toArray();

        // Muodosta lista uniikeista käyttäjä-ID:istä, joita etsitään
        const userIds = friends.reduce((acc, friend) => {
          if (
            friend.userID !== decoded.userId &&
            !acc.includes(friend.userID)
          ) {
            acc.push(friend.userID);
          }
          if (
            friend.friendID !== decoded.userId &&
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

        // Yhdistä kaverit ja käyttäjätiedot

        const friendsList = friends.map((friend) => {
          const friendIdString =
            friend.userID === decoded.userId ? friend.friendID : friend.userID;
          const friendId = new ObjectId(friendIdString);
          const friendDetails = userDetails.find((user) =>
            user._id.equals(friendId)
          );
          return {
            id: friendIdString,
            name: friendDetails ? friendDetails.username : null,
            status: friend.status,
          };
        });

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

        // Lisää lähettäjän nimi jokaiseen viestiin
        messages = messages.map(message => {
            return {
                ...message,
                senderName: usersMap[message.senderId], // Lisää lähettäjän nimi viestiin
            };
        });

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
          id: user._id
      }));

      console.log('Modified users:', modifiedUsers);

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

      res.status(200).json({ message: 'Like added.', likesCount: likesCount  });
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

      res.status(200).json({ message: 'Like removed.', likesCount: likesCount  });
  } catch (error) {
    res.status(500).json({ message: 'Error removing like.' });
  }
});




//TÄMÄN YLÄPUOLELLE KAIKKI API PYYNNÖT
  } catch (error) {
    console.error("Virhe yhdistettäessä MongoDB:hen:", error);
  }
}
main().catch(console.error);
