import Users from 'meteor/vulcan:users'
import { foreignKeyField } from '../../utils/schemaUtils'
import { schemaDefaultValue } from '../../collectionUtils'

export const subscriptionTypes = {
  newComments: 'newComments',
  newPosts: 'newPosts',
  newRelatedQuestions: 'newRelatedQuestions',
  newEvents: 'newEvents',
  newReplies: 'newReplies'
}

const schema = {
  _id: {
    optional: true,
    type: String,
    canRead: [Users.owns],
  },
  createdAt: {
    type: Date,
    optional: true,
    canRead: [Users.owns],
    onCreate: () => new Date(),
  },
  userId: {
    ...foreignKeyField({
      idFieldName: "userId",
      resolverName: "user",
      collectionName: "Users",
      type: "User",
    }),
    onCreate: ({currentUser}) => currentUser._id,
    canRead: [Users.owns],
    optional: true,
  },
  state: {
    type: String,
    allowedValues: ['subscribed', 'suppressed'],
    canCreate: ['members'],
    canRead: [Users.owns],
  },
  documentId: {
    type: String,
    canRead: [Users.owns],
    canCreate: ['members']
  },
  collectionName: {
    type: String, 
    canRead: [Users.owns],
    canCreate: ['members']
  },
  deleted: {
    type: Boolean,
    canRead: [Users.owns],
    ...schemaDefaultValue(false),
    optional: true
  },
  type: {
    type: String,
    allowedValues: Object.values(subscriptionTypes),
    canCreate: ['members'],
    canRead: [Users.owns]
  }
};

export default schema;
