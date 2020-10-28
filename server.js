'use strict';

// require built-in dependencies
const path = require('path');
const util = require('util');
const fs = require('fs');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readDir = util.promisify(fs.readdir);

// require express-related dependencies
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// require local dependencies
const logger = require('./middleware/logger');

// declare local constants and helper functions
const PORT = process.env.PORT || 3000;
const DATA_DIR = 'data';
const TAG_RE = /#\w+/g;
const slugToPath = (slug) => {
  const filename = `${slug}.md`;
  return path.join(DATA_DIR, filename);
};

// initialize express app
const app = express();

// use middlewares
app.use(cors());
app.use(logger);
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, 'client', 'build')));


// GET: '/api/page/:slug'
app.get('/api/page/:slug', async (req, res) => {
  const filename = slugToPath(req.params.slug);
  try {
    const body = await readFile(filename, 'utf-8');
    // success response: {status: 'ok', body: '<file contents>'}
    res.json({ status: 'ok', body });
  } catch (err) {
    // failure response: {status: 'error', message: 'Page does not exist.'}
    res.json({ status: 'error', message: 'Page does not exist.' });
  }
});


// POST: '/api/page/:slug'
app.post('/api/page/:slug', async (req, res) => {
  const filename = slugToPath(req.params.slug);
  // read from body
  //  body: {body: '<file text content>'}
  const content = req.body.body;
  try {
    // tries to write the body to the given file
    await writeFile(filename, content, 'utf8');
    //  success response: {status: 'ok'}
    res.json({ status: 'ok' });
  } catch (err) {
    //  failure response: {status: 'error', message: 'Could not write page.'}
    res.json({ status: 'error', message: 'Could not write page.' });
  }
});


// GET: '/api/pages/all'
app.get('/api/pages/all', async (req, res) => {
  try {
    // sends an array of all file names in the DATA_DIR
    const pagesFetch = await readDir(DATA_DIR, 'utf-8');
    const listPages = pagesFetch
      .map((page) => 
        // file names do not have .md, just the name!
        page.replace('.md', ''));
    //  success response: {status:'ok', pages: ['fileName', 'otherFileName']}
    res.json({ status: 'ok', pages: listPages });
  } catch (err) {
    //  failure response: no failure response
    res.json({status: 'error', message: err.message});
  }
});

// GET: '/api/tags/all'
app.get('/api/tags/all', async (req, res) => {
  try{
    // sends an array of all tag names in all files, without duplicates!
    const tagsNames = [];
    const pagesFetch = await readDir(DATA_DIR, 'utf8');
    
    const listTags = pagesFetch.forEach(file => {
        const slugPath = slugToPath(file.replace('.md', '').toLowerCase());
        const fileContent = fs.readFileSync(slugPath, 'utf-8');
        // return early if file doesn't have tag, otherwise it generates an error
        if (!fileContent.match(TAG_RE)) {
            return;
        };
        // tags are any word in all documents with a # in front of it
        // hint: use the TAG_RE regular expression to search the contents of each file
        const tagList = fileContent.match(TAG_RE);
        tagList.forEach((item) => {
          if (!tagsNames.includes(item.replace('#', '')))
          tagsNames.push(item.replace('#', ''))
      });
    
    });
    //  success response: {status:'ok', tags: ['tagName', 'otherTagName']}
    res.send({ status: 'ok', tags: tagsNames });
  } catch(err) {
    //  failure response: no failure response
    res.send({status: 'error', message: err.message});
   }
});


// GET: '/api/tags/:tag'
app.get('/api/tags/:tag', async (req, res) => {
  try {
  // searches through the contents of each file looking for the :tag
  const tagParam = req.params.tag;
  // it will send an array of all file names that contain this tag (without .md!)
  const listFilesTags = [];
  const pagesFetch = await readDir(DATA_DIR, 'utf8');
  const listTags = pagesFetch.forEach(file => {
      const slugPath = slugToPath(file.replace('.md', '').toLowerCase());
      const fileContent = fs.readFileSync(slugPath, 'utf8');
      if (fileContent.indexOf('#' + tagParam) >= 0) {
          listFilesTags.push(file.replace('.md', ''));
          console.log(`Your word was found in file: ${file}`);
      }
  });
  //  success response: {status:'ok', tag: 'tagName', pages: ['tagName', 'otherTagName']}
    res.send({ status: 'ok', tag: tagParam, pages: listFilesTags });
  } catch(err) {
    //  failure response: no failure response
    res.send({ status: 'error', message: err.message });
    };
});


// this needs to be here for the frontend to create new wiki pages
//  if the route is not one from above
//  it assumes the user is creating a new page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Server
app.listen(PORT, (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`Wiki app is serving at http://localhost:${PORT}`)
});
