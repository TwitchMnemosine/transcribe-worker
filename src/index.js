require('dotenv').config();
const container = require('./container');

const {eventBus:{topicToPublish}} = require('./infrastructure/config');
const messageBroker = container.resolve('messageBroker');
const transcriptStream = container.resolve('transcriptStream');

setImmediate(async() => {
  await messageBroker.createQueue(topicToPublish);
  await messageBroker.consume(topicToPublish, async (message,ack) => {
    await transcriptStream.execute({streamId: message.body.streamId});
    console.log('FINISHED');
    ack()
  })
})