#ghpm

An npm mirror/proxy directly to modules on GitHub, falling back to npm where required data is missing from npm (repo link) or GitHub (version tags)


## Setup

    git clone git@github.com:andrew/ghpm.git
    cd ghpm
    npm install

Create a Personal Access Token on GitHub: https://github.com/settings/tokens/new

    ACCESS_TOKEN=123456789 node index.js

Use your custom registry with npm:

    npm install some_module --registry http://localhost:8000

## TODO

* cache responses from GitHub
* Use a better cache than an object in memory
* fix the nasty shasum hack
* `latest` response needs to have all versions, not just latest

## Copyright

Copyright (c) 2013 Andrew Nesbitt. See [LICENSE](https://github.com/andrew/ghpm/blob/master/LICENSE) for details.
