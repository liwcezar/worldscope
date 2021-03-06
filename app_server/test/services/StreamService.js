var rfr = require('rfr');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Code = require('code');
var expect = Code.expect;
var Promise = require('bluebird');

var Storage = rfr('app/models/Storage');
var Service = rfr('app/services/Service');
var CustomError = rfr('app/util/Error');
var TestUtils = rfr('test/TestUtils');

var testStream = {
  title: 'this is a title from stream service',
  description: 'arbitrary description',
  appInstance: '123-123-123-123'
};

var testStream2 = {
  title: 'Its more recent title from stream service',
  description: 'arbitrary description',
  appInstance: '7777-777-777',
  createdAt: new Date('2017-07-07')
};

var testStream3 = {
  title: 'old stream, ended stream',
  description: 'arbitrary description',
  appInstance: '7999-777-777',
  createdAt: new Date('2015-01-01'),
  endedAt: new Date('2015-01-02'),
  live: false
};

var alice = {
  username: 'Alice',
  alias: 'Alice in the wonderland',
  email: 'alice@apple.com',
  password: 'generated',
  accessToken: 'anaccesstoken',
  platformType: 'facebook',
  platformId: '45454545454',
  description: 'nil'
};

var bob = {
  username: 'Bob',
  alias: 'Bob the Builder',
  email: 'bob@bubblegum.com',
  password: 'generated',
  accessToken: 'xyzabc',
  platformType: 'facebook',
  platformId: '1238943948',
  description: 'bam bam bam'
};

lab.experiment('StreamService Tests', function() {

  lab.beforeEach({timeout: 10000}, function(done) {
    TestUtils.resetDatabase(done);
  });

  lab.test('createNewStream valid', function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(result) {
      Code.expect(result.title).to.be.equal(testStream.title);
      Code.expect(result.description).to.be.equal(testStream.description);
      Code.expect(result.createdAt).to.match(/\d{10}/);
      Code.expect(result.streamer.username).to.be.equal(bob.username);
      Code.expect(result.streamer.createdAt).to.match(/\d{10}/);
      done();
    });
  });

  lab.test('createNewStream undefined userId', function(done) {
    Service.createNewStream(bob.userId, testStream).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.NotFoundError);
      Code.expect(result.message).to.be.equal('User not found');
      done();
    });
  });

  lab.test('createNewStream invalid missing appInstance', function(done) {
    var testStream = {
      title: 'this is a title from stream service',
      description: 'arbitrary description'
    };

    Service.createNewStream(bob.userId, testStream).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.InvalidFieldError);
      done();
    });
  });

  lab.test('createNewstream invalid empty title', function(done) {
    var testStream = {
      title: '',
      description: 'arbitrary description',
      appInstance: '123-123-123-123'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.InvalidFieldError);
      Code.expect(result.extra).to.be.equal('title');
      done();
    });
  });

  lab.test('createNewstream invalid duplicate appInstance', function(done) {
    var dupStream = {
      title: 'duplicate',
      description: 'arbitrary description',
      appInstance: '123-123-123-123'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, dupStream);
    }).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.InvalidFieldError);
      Code.expect(result.message).to.be.equal('appInstance must be unique');
      Code.expect(result.extra).to.be.equal('appInstance');
      done();
    });
  });

  lab.test('getStreamById valid', function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(result) {
      return Service.getStreamById(result.streamId);
    }).then(function(result) {
      Code.expect(result.title).to.be.equal(testStream.title);
      Code.expect(result.description).to.be.equal(testStream.description);
      Code.expect(result.streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getStreamById empty Id', function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(result) {
      return Service.getStreamById('');
    }).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.NotFoundError);
      Code.expect(result.message).to.be.equal('Stream not found');
      done();
    });
  });

  lab.test('getStreamById invalid Id', function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(result) {
      return Service.getStreamById('asd-234234');
    }).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.NotFoundError);
      Code.expect(result.message).to.be.equal('Stream not found');
      done();
    });
  });

  lab.test('getListOfStreams valid no streams', function(done) {
    var filters = {
      state: 'all',
      sort: 'title',
      order: 'asc'
    };

    Service.getListOfStreams(filters, null).then(function(result) {
      Code.expect(result).to.have.length(0);
      done();
    });
  });

  lab.test('getListOfStreams valid sorted by title asc', function(done) {
    var filters = {
      state: 'all',
      sort: 'title',
      order: 'asc'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream2);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream3);
    }).then(function() {
      return Service.getListOfStreams(filters, null);
    }).then(function(result) {
      Code.expect(result).to.have.length(3);
      Code.expect(result[0].title).to.be.equal(testStream2.title);
      Code.expect(result[0].streamer.username).to.be.equal(bob.username);
      Code.expect(result[1].title).to.be.equal(testStream3.title);
      Code.expect(result[1].streamer.username).to.be.equal(bob.username);
      Code.expect(result[2].title).to.be.equal(testStream.title);
      Code.expect(result[2].streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getListOfStreams valid sorted by title desc', function(done) {
    var filters = {
      state: 'all',
      sort: 'title',
      order: 'desc'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream2);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream3);
    }).then(function() {
      return Service.getListOfStreams(filters, null);
    }).then(function(result) {
      Code.expect(result).to.have.length(3);
      Code.expect(result[0].title).to.be.equal(testStream.title);
      Code.expect(result[0].streamer.username).to.be.equal(bob.username);
      Code.expect(result[1].title).to.be.equal(testStream3.title);
      Code.expect(result[1].streamer.username).to.be.equal(bob.username);
      Code.expect(result[2].title).to.be.equal(testStream2.title);
      Code.expect(result[2].streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getListOfStreams valid live sorted by time asc', function(done) {
    var filters = {
      state: 'live',
      sort: 'time',
      order: 'asc'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream2);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream3);
    }).then(function() {
      return Service.getListOfStreams(filters, null);
    }).then(function(result) {
      Code.expect(result).to.have.length(2);
      Code.expect(result[0].title).to.be.equal(testStream.title);
      Code.expect(result[0].streamer.username).to.be.equal(bob.username);
      Code.expect(result[1].title).to.be.equal(testStream2.title);
      Code.expect(result[1].streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getListOfStreams valid live sorted by time desc', function(done) {
    var filters = {
      state: 'live',
      sort: 'time',
      order: 'desc'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream2);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream3);
    }).then(function() {
      return Service.getListOfStreams(filters, null);
    }).then(function(result) {
      Code.expect(result).to.have.length(2);
      Code.expect(result[0].title).to.be.equal(testStream2.title);
      Code.expect(result[0].streamer.username).to.be.equal(bob.username);
      Code.expect(result[1].title).to.be.equal(testStream.title);
      Code.expect(result[1].streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getListOfStreams valid state live', function(done) {
    var filters = {
      state: 'live',
      sort: 'title',
      order: 'asc'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream2);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream3);
    }).then(function() {
      return Service.getListOfStreams(filters, null);
    }).then(function(result) {
      Code.expect(result).to.have.length(2);
      Code.expect(result[0].title).to.be.equal(testStream2.title);
      Code.expect(result[0].streamer.username).to.be.equal(bob.username);
      Code.expect(result[1].title).to.be.equal(testStream.title);
      Code.expect(result[1].streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getListOfStreams valid state done', function(done) {
    var filters = {
      state: 'done',
      sort: 'title',
      order: 'asc'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream2);
    }).then(function(stream) {
      return Service.createNewStream(stream.owner, testStream3);
    }).then(function() {
      return Service.getListOfStreams(filters, null);
    }).then(function(result) {
      Code.expect(result).to.have.length(1);
      Code.expect(result[0].title).to.be.equal(testStream3.title);
      Code.expect(result[0].streamer.username).to.be.equal(bob.username);
      done();
    });
  });

  lab.test('getListOfStreams valid isSubscribed true', function(done) {
    var filters = {
      state: 'all',
      sort: 'title',
      order: 'asc'
    };

    var userPromise1 = Service.createNewUser(bob);
    var userPromise2 = Service.createNewUser(alice);

    Promise.join(userPromise1, userPromise2,
      function(bob, alice) {
        return Service.createSubscription(alice.userId, bob.userId)
        .then(function() {
          return Service.createNewStream(bob.userId, testStream);
        }).then(function(stream) {
          return Service.createNewStream(stream.owner, testStream2);
        }).then(function() {
          return Service.getListOfStreams(filters, alice.userId);
        }).then(function(result) {
          Code.expect(result[0].title).to.be.equal(testStream2.title);
          Code.expect(result[0].streamer.username).to.be.equal(bob.username);
          Code.expect(result[0].streamer.isSubscribed).to.be.true();
          done();
        });
      });
  });

  lab.test('Get streams from subscriptions valid', function(done) {
    var userPromise1 = Service.createNewUser(bob);
    var userPromise2 = Service.createNewUser(alice);

    Promise.join(userPromise1, userPromise2,
      function(bob, alice) {
        return Service.createSubscription(bob.userId, alice.userId)
        .then((subscription) => {
          return Service.createNewStream(alice.userId, testStream);
        }).then((stream) => {
          return Service.createNewStream(alice.userId, testStream2);
        }).then((stream) => {
          return Service.getStreamsFromSubscriptions(bob.userId);
        }).then((res) => {
          Code.expect(res[0].title).to.be.equal(testStream2.title);
          Code.expect(res[0].streamer.username).to.be.equal(alice.username);
          Code.expect(res[0].streamer.isSubscribed).to.be.true();
          Code.expect(res[1].title).to.be.equal(testStream.title);
          Code.expect(res[1].streamer.username).to.be.equal(alice.username);
          Code.expect(res[1].streamer.isSubscribed).to.be.true();
          done();
        });
      });
  });

  lab.test('Get streams from subscriptions valid no streams from subscribers',
    function(done) {
      var userPromise1 = Service.createNewUser(bob);
      var userPromise2 = Service.createNewUser(alice);

      Promise.join(userPromise1, userPromise2,
        function(bob, alice) {
          return Service.createSubscription(bob.userId, alice.userId)
          .then((subscription) => {
            return Service.getStreamsFromSubscriptions(bob.userId);
          }).then((res) => {
            Code.expect(res).to.be.deep.equal([]);
            done();
          });
        });
    });

  lab.test('Get streams from subscriptions valid no subscribers',
    function(done) {
      var userPromise1 = Service.createNewUser(bob);

      userPromise1.then((user) => {
        return Service.getStreamsFromSubscriptions(user.userId).then((res) => {
          Code.expect(res).to.be.deep.equal([]);
          done();
        });
      });
    });

  lab.test('Update Stream valid', function(done) {
    var updates = {
      title: 'new title',
      description: 'a description'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.updateStream(stream.streamId, updates);
    }).then(function(result) {
      Code.expect(TestUtils.isEqualOnProperties(updates, result)).to.be.true();
      done();
    });
  });

  lab.test('Update Stream invalid empty title', function(done) {
    var updates = {
      title: '',
      description: 'a description'
    };

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.updateStream(stream.streamId, updates);
    }).then(function(result) {
      Code.expect(result).to.be.an.instanceof(CustomError.InvalidFieldError);
      done();
    });
  });

  lab.test('Update Stream invalid streamId', function(done) {
    var updates = {
      title: 'new title',
      description: 'a description'
    };

    Service.updateStream(TestUtils.invalidId, updates)
      .then(function(result) {
        Code.expect(result).to.be.an.instanceof(CustomError.NotFoundError);
        done();
      });
  });

  lab.test('End stream valid', {timeout: 5000}, function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.endStream(stream.owner, stream.streamId);
    }).then(function(res) {
      Code.expect(res).to.equal('Success');
      done();
    });
  });

  lab.test('End stream and view count updated', {timeout: 5000},
    function(done) {

      Service.createNewUser(bob).then(function(user) {
        return Service.createNewStream(user.userId, testStream);
      }).then(function(stream) {
        return Service.createView(stream.owner, stream.streamId);
      }).then(function(view) {
        return Service.endStream(view.userId, view.streamId);
      }).then(function(res) {
        Code.expect(res).to.equal('Success');
        checkNumberOfViewers();
      });

      function checkNumberOfViewers() {
        Storage.getListOfStreams({state: 'all', sort: 'title', order: 'asc'})
          .then(function(streams) {
            Code.expect(streams[0].totalViewers).to.equal(1);
            done();
          });
      }
    });

  lab.test('End stream invalid streamId', function(done) {

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.endStream(stream.owner, TestUtils.invalidId);
    }).then(function(res) {
      Code.expect(res).to.be.an.instanceof(CustomError.NotFoundError);
      Code.expect(res.message).to.be.equal('Stream not found');
      done();
    });
  });

  lab.test('End stream invalid not owner of stream', function(done) {

    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.endStream(TestUtils.invalidId, stream.streamId);
    }).then(function(res) {
      Code.expect(res).to.be.an.instanceof(CustomError.NotAuthorisedError);
      Code.expect(res.message).to.be.equal('Not authorised to end stream');
      done();
    });
  });

  lab.test('Delete stream valid', function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.deleteStream(stream.streamId);
    }).then(function(res) {
      Code.expect(res).to.be.an.true();
      done();
    });
  });

  lab.test('Delete stream invalid streamId', function(done) {
    Service.createNewUser(bob).then(function(user) {
      return Service.createNewStream(user.userId, testStream);
    }).then(function(stream) {
      return Service.deleteStream(TestUtils.invalidId);
    }).then(function(res) {
      Code.expect(res).to.be.an.instanceof(CustomError.NotFoundError);
      Code.expect(res.message).to.be.equal('Stream not found');
      done();
    });
  });
});


lab.experiment('StreamService Tests for Comments', function () {

  var comment1 = {
    content: 'How do I live without you',
    createdAt: 1457431895000,
    alias: 'mariah'
  };

  var comment2 = {
    content: 'How do I breathe without you',
    createdAt: 1457431905000,
    alias: 'carey'
  };

  var comment3 = {
    content: 'How do I ever',
    createdAt: 1457431915000,
    alias: 'darren'
  };

  lab.beforeEach({timeout: 10000}, function (done) {
    TestUtils.resetDatabase(done);
  });

  lab.test('Create Comment valid', function(done) {
    var userPromise = Service.createNewUser(alice);
    var streamPromise = userPromise
      .then((user) => Service.createNewStream(user.userId, testStream));

    Promise.join(userPromise, streamPromise,
      function(user, stream) {
        Service.createComment(user.userId, stream.streamId, comment1)
          .then(function(res) {
            expect(res.content).to.equal(comment1.content);
            expect(res.userId).to.equal(user.userId);
            expect(res.streamId).to.equal(stream.streamId);
            done();
          });
      });
  });

  lab.test('Create Comment invalid empty string', function(done) {
    var userPromise = Service.createNewUser(alice);
    var streamPromise = userPromise
      .then((user) => Service.createNewStream(user.userId, testStream));

    Promise.join(userPromise, streamPromise,
      function(user, stream) {
        Service.createComment(user.userId, stream.streamId, {content: ''})
          .then(function(err) {
            expect(err).to.be.an.instanceof(Error);
            done();
          });
      });
  });

  lab.test('Create Comment valid duplicate', function(done) {
    var userPromise = Service.createNewUser(alice);
    var streamPromise = userPromise
      .then((user) => Service.createNewStream(user.userId, testStream));

    Promise.join(userPromise, streamPromise,
      function(user, stream) {
        Service.createComment(user.userId, stream.streamId, comment1)
          .then(() => Service.createComment(user.userId, stream.streamId,
                                            comment1))
          .then((res) => {
            expect(res.content).to.equal(comment1.content);
            expect(res.userId).to.equal(user.userId);
            expect(res.streamId).to.equal(stream.streamId);
            done();
          });
      });
  });

  lab.test('Get list of comments', function(done) {
    var userPromise = Service.createNewUser(alice);
    var streamPromise = userPromise
      .then((user) => Service.createNewStream(user.userId, testStream));

    Promise.join(userPromise, streamPromise,
      function(user, stream) {
        Service.createComment(user.userId, stream.streamId, comment1)
          .then(() => Service.createComment(user.userId, stream.streamId,
                                            comment2))
          .then(() => Service.createComment(user.userId, stream.streamId,
                                            comment3))
          .then(() => Service.getListOfCommentsForStream(stream.streamId))
          .then((res) => {
            expect(res).to.have.length(3);
            done();
          });
      });
  });

  lab.test('Get list of comments non-existing stream', function(done) {
    var userPromise = Service.createNewUser(alice);
    var streamPromise = userPromise
      .then((user) => Service.createNewStream(user.userId, testStream));

    Promise.join(userPromise, streamPromise,
      function(user, stream) {
        Service.createComment(user.userId, stream.streamId, comment1)
          .then(() => Service.getListOfCommentsForStream(TestUtils.invalidId))
          .then((res) => {
            expect(res).to.be.an.instanceof(CustomError.NotFoundError);
            done();
          });
      });
  });
});


