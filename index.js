var restify = require('restify'),
    sha = require('sha'),
    request = require("request"),
    fs = require('fs'),
    octonode = require('octonode'),
    github = octonode.client('53de7dbb03378ec65a6180750b55fa494bd12867')

var server = restify.createServer();

server.use(restify.bodyParser());

server.get('/', function (req, res) {
  res.send('GPM says hi')
});

var gitRegex = /github.com\/([A-Za-z0-9-\.\/]+)/
var versionRegex = /(v?)(.+)/

var npmModules = {}

server.get('/:name', function (req, res) {
  var name = req.params.name;

  var npmURL = 'http://registry.npmjs.org/'+name

  version = null

  loadFromNPM(name, version, function(info){
    var nameWithOwner = parseRepoURL(info)

    moduleData(name, nameWithOwner, version, function(data, releases){
      if(releases.length > 0){
        var versions = {}
        for (var i = 0; i < releases.length; ++i)
          versions[releases[i]] = {'version': releases[i]};

        var version = releases[0].match(versionRegex)[2]

        // download all the versions to get their shasums

        var original = JSON.parse(JSON.stringify(data))
        data["dist-tags"] = { "latest": version }
        data["versions"] = {}
        data["versions"][version] = original
      }

      res.json(200, data);
    })
  })
});

server.get('/:name/:version', function (req, res) {
  var name = req.params.name;
  var version = req.params.version;

  loadFromNPM(name, version, function(info){
    var nameWithOwner = parseRepoURL(info)

    moduleData(name, nameWithOwner, version, function(data, releases){
      res.json(200, data);
    })
  })
});

var parseRepoURL = function(info){
  if(info.repository == undefined) {
    return null
  }
  var nameWithOwner = info.repository.url.match(gitRegex)[1]
  if (endsingit = nameWithOwner.match(/(.+)(\.git)$/)){
    nameWithOwner = endsingit[1]
  }
  return nameWithOwner
}

var loadFromNPM = function(name, version, cb){
  var cacheName = name + '-' + version
  if(npmModules[cacheName] == undefined) {
    var npmURL = 'http://registry.npmjs.org/' + name
    if (version != null) { npmURL += '/' + version }

    request(npmURL, function(err, resp, body){
      var info = JSON.parse(body)
      npmModules[cacheName] = info
      cb(info)
    })
  } else {
    cb(npmModules[cacheName])
  }
}

var moduleData = function(name, nameWithOwner, version, cb){
  var cacheName = name + '-' + version

  if(nameWithOwner === null){
    console.log('no repo info on npm for ' + name + '@' + version)
    cb(npmModules[cacheName], [])
    return
  }

  github.get('/repos/'+ nameWithOwner +'/tags', {}, function(err, status, body, headers){
    if(err){
      console.log(nameWithOwner, 'likely not on github')
      cb(npmModules[cacheName], [])
      return
    }

    if (body.length < 1) {
      console.log(nameWithOwner, 'No tags on github :/')
      cb(npmModules[cacheName], [])
      return
    }

    var releases = body.filter(function(val) { return val !== null; })

    releases = releases.map(function(a){
      return a.name
    })

    var incV = ''
    if(releases[0][0] == 'v'){
      incV = 'v'
    }

    if(version == null)
      version = releases[0].match(versionRegex)[2]

    var tarballURL =  'https://github.com/'+ nameWithOwner+"\/tarball\/"+incV+version;
    var tmppath = 'tmp/'+name+'+'+version
    var file = fs.createWriteStream(tmppath);
    request(tarballURL).pipe(file)

    file.on('finish', function() {
      file.close();

      sha.get(tmppath, function(err, shasum){
        data = {
          "name": name,
          "_id": name,
          "version": version,
          "dist": {
            "shasum": shasum,
            "tarball": tarballURL
          }
        }

        cb(data, releases)
      })
    });
  })
}

server.listen(8000, function() {
  console.log('GPM started at %s', server.url);
});
