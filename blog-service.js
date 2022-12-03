const Sequelize = require('sequelize');

const sequelize = new Sequelize('vuuleqsg', 'vuuleqsg', 'D8AKPkqBw-uZRVinhnUhJmOk0cXfKdng', {
    host: 'peanut.db.elephantsql.com',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    },
    query: { raw: true }
});

//creating the EMPLOYEE model
const Post = sequelize.define('Post', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  body: Sequelize.TEXT,
  title: Sequelize.STRING,
  postDate: Sequelize.DATE,
  featureImage: Sequelize.STRING,
  published: Sequelize.BOOLEAN
}, {
    createdAt: false, // disable createdAt
    updatedAt: false // disable updatedAt
});

//creating the DEPARTMENT model
const Category = sequelize.define('Category', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category: Sequelize.STRING
}, {
    createdAt: false, // disable createdAt
    updatedAt: false // disable updatedAt
});

// Relationship
Post.belongsTo(Category, { foreignKey: 'category' });

// Introducing the initialize() function
module.exports.initialize = function () {
  return new Promise(function (resolve, reject) { 
    sequelize.sync().then(() => {
      resolve();
    }).catch((error) => {
      reject("unable to sync the database");
    });

  });
};

module.exports.getAllPosts = function() {
    return new Promise(function (resolve, reject) {
    Post.findAll().then((data) => {
      resolve(data);
    }).catch((error) => {
      reject("no results returned");
    });
  });
}

module.exports.getPostsByCategory = function(category) {
    return new Promise((resolve, reject) => {
      Post.findAll({
        where: {
          category
      }}).then((data) => {
      resolve(data);
    }).catch((error) => {
      reject("no results returned");
    });
  });
}

module.exports.getPostsByMinDate = function(minDateStr) {
    const { gte } = Sequelize.Op;
    return new Promise((resolve, reject) => {
        Post.findAll({
          postDate: {
            [gte]: new Date(minDateStr)
          }
        }).then((data) => {
        resolve(data[0]);
      }).catch((error) => {
        reject("no results returned");
      });
    });
}

module.exports.getPostById = function(id) {
    return new Promise((resolve, reject) => {
      Post.findAll({
        where: {
          id
        }
      }).then((data) => {
      resolve(data[0]);
    }).catch((error) => {
      reject("no results returned");
    });
  });
}

module.exports.addPost = function(postData) {
    return new Promise(function (resolve, reject) {
    //setting some parameters of postData 
    postData.published = postData.published ? "true" : "false";
    for (const prop in postData) {
      if (postData[prop] == "") {
        postData[prop] = null;
      }
    }

    //creating new POST

    Post.create({
      title: postData.title,
      body: postData.body,
      published: postData.published,
      postDate: postData.postDate,
      category: postData.category,
      featureImage: null
    }).then(() => {
      resolve("Post created successfully");
    }).catch((error) => {
      reject("unable to create Post");
    });
});
}

module.exports.getPublishedPosts = function() {
    return new Promise((resolve, reject) => {
      Post.findAll({
        where: {
          published: true
        }
      }).then((data) => {
      resolve(data);
    }).catch((error) => {
      reject("no results returned");
    });
  });
}

module.exports.getCategories = function() {
    return new Promise((resolve, reject) => {
    Category.findAll().then((data) => {
      resolve(data);
    }).catch((error) => {
      reject("no results returned");
    })
  });
}

module.exports.addCategory = function(postCategory) {
    return new Promise((resolve, reject) => {
    //setting some parameters of postData 
    for (const prop in postCategory) {
      if (postCategory[prop] == "") {
        postCategory[prop] = null;
      }
    }

    //creating new CATEGORY

    Category.create({
      category: postCategory.category
    }).then(() => {
      resolve("Category created successfully");
    }).catch((error) => {
      reject("unable to create Category");
    });
  });
}

module.exports.getPublishedPostsByCategory = function(category) {
    return new Promise((resolve, reject) => {
      Post.findAll({
        where: {
          published: true,
          category
        }
      }).then((data) => {
      resolve(data);
    }).catch((error) => {
      reject("no results returned");
    });
  });
}

module.exports.deleteCategoryById = function(id) {
    return new Promise((resolve, reject) => {
      Category.destroy({
        where: {
          id
        }
      }).then(() => {
      resolve("Category deleted successfully!");
    }).catch((error) => {
      reject("Something went wrong!");
    });
  });
}

module.exports.deletePostById = function(id) {
    return new Promise((resolve, reject) => {
      Post.destroy({
        where: {
          id
        }
      }).then(() => {
      resolve("Post deleted successfully!");
    }).catch((error) => {
      reject("Something went wrong!");
    });
  });
}