const { Schema } = require('mongoose');
const { createSchema } = require('../../helpers');
const { searchPlugin } = require('../../plugins');
const { to, toRegEx } = require('../../mappers');
const roleSchema = require('./common/role.schema');
const { CENTERS } = require('../../../constants');

const schema = createSchema({
  image: String,
  no: {
    type: String,
    trim: true,
    unique: true,
  },
  name: {
    type: String,
    trim: true,
    index: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    required: true,
  },
  center: {
    type: String,
    enum: CENTERS,
  },
  department: {
    type: String,
    trim: true,
    required: true,
  },
  position: String,
  roles: [{ ...roleSchema, index: true }],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true,
  }
}, {
  createdAt: 'joinedAt'
});

schema.index('joinedAt');

schema.plugin(searchPlugin({
  populate: [{ path: 'user', select: '-hashedPassword' }],
  sort: 'name',
  mapper: {
    no: toRegEx,
    name: toRegEx,
    email: toRegEx,
    phone: toRegEx,
    roles: to,
  }
}));

module.exports = schema;
