chatStream = new Meteor.Stream('chat');

if(Meteor.isServer) {
  var rooms = new Meteor.Collection('rooms');
  chatStream.on('subscribeToRoom', function (roomId) {
console.log('roomId: ', roomId, this);
    var subscriptionId = this.subscriptionId;
    // For instance only allow a user to be in one room
    if (rooms.find({subscriptionId: this.subscriptionId}).count()) {
      rooms.delete({subscriptionId: this.subscriptionId});
    }
    rooms.insert({subscriptionId: this.subscriptionId, roomId: roomId});
    
    this.onDisconnect = function() {
      rooms.delete({subscriptionId: this.subscriptionId});
    }
  });
  
  chatStream.permissions.read(function(event) {
    //getting roomId from the event
    var matched = event.match(/(.*):/); // or /(.*):message/ to limit only to message event
    if(matched) {
      var roomId = matched[1],
          subscriptionFound = rooms.find({roomId: roomId}).count();
      
console.log('subscriptionFound: ', subscriptionFound);
      //only allow events with roomId where subscription has the right roomId
      return subscriptionFound > 0;
    } else {
      return false;
    }
  }, false); //end false make sure
}

if(Meteor.isClient) {
  chatData = new Meteor.Collection(null);
  
  sendChat = function(message) {
    var date = new Date();
    chatStream.emit(Session.get('roomId') + ':message', message, date);
  };

  chatStream.on(Session.get('roomId') + ':message', function(message, date) {
    console.log('chatStream message: ', arguments);
    var id = chatData.insert({msg: message, date: date, roomId: Session.get('roomId')});
  });
  
  Template.roomList.helpers({
    rooms: function () {
      return [{roomId: 1}, {roomId: 20}]; 
    }
  });
  
  Template.room.helpers({
    conversations: function getConversations() {
      return chatData.find({}, {sort: {date: 1}}); 
    }
  });
  
  Meteor.Router.add({
    '/': 'roomList',
    '/list': 'roomList',
    '/room/:id': {
      to: 'room', and: function (id) {
        Session.set('roomId', id);
        chatStream.emit('subscribeToRoom', id);
      }
    }
  });
}