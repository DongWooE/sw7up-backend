const { Qna, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasPermission } = require('../../../../shared/utils/permission');
const { sendMail } = require('../../../../shared/services/mail');
const { WEB_APP_HOST } = require('../../../../shared/env');
const {
  FORBIDDEN,
  INVALID_PASSWORD,
  PASSWORD_REQUIRED,
  QNA_NOT_FOUND,
  REPLY_NOT_FOUND,
  WRITER_INFO_REQUIRED,
} = require('../../../../shared/errors');


const getQnAs = async (req, res, next) => {
  const { query } = req;
  try {
    const documents = await Qna.search(query, null, [{ path: 'writer', model: UserInfo }]);
    res.json(createResponse(res, documents));
  } catch (e) {
    next(e);
  }
};

const getQnA = async (req, res, next) => {
  const { params: { id }, body: { password } = {}, user } = req;

  try {
    const doc = await Qna.findById(id)
      .populate({ path: 'writer', model: UserInfo })
      .populate({ path: 'replies.writer', model: UserInfo });

    if (!doc) return next(QNA_NOT_FOUND);
    if (!doc.confirm) {
      if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);
    }

    const data = JSON.parse(JSON.stringify(doc));
    delete data.hashedPassword;

    res.json(createResponse(res, data));
  } catch (e) {
    next(e);
  }
};

const getSimpleQnA = async (req, res, next) => {
  const { params: { id } } = req;

  try {
    const doc = await Qna.findById(id)
      .select('title writer secret')
      .populate({ path: 'writer', model: UserInfo });
    if (!doc) return next(QNA_NOT_FOUND);
    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const createQnA = async (req, res, next) => {
  const { body, user } = req;

  if (user) {
    body.writer = user.info;
    delete body.password;
    delete body.writerInfo;
  } else {
    if (!body.writerInfo) return next(WRITER_INFO_REQUIRED);
    if (!body.password) return next(PASSWORD_REQUIRED);
    delete body.writer;
  }

  try {
    const doc = await Qna.create(body);
    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const addReply = async (req, res, next) => {
  const { params: { id }, body: { password, content }, user } = req;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);

    const reply = { content };

    if (user) reply.writer = user.info;
    else reply.writerInfo = doc.writerInfo;

    doc.replies = [...doc.replies, reply];
    doc.confirm = user && String(doc.writer) !== String(user.info);

    if (doc.confirm) {
      const writer = doc.writer ? await UserInfo.findById(doc.writer) : doc.writerInfo;
      if (writer && writer.email) sendMail('E-Help Desk 답변 알림', createQnAContent(doc), writer.email);
    }

    await doc.save();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const checkPassword = async (req, res, next) => {
  const { params: { id }, body: { password } } = req;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    if (doc.writer) return next(FORBIDDEN);
    if (!doc.authenticate(password)) return next(INVALID_PASSWORD);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const updateQnA = async (req, res, next) => {
  const { params: { id }, body: $set, user } = req;
  const { password } = $set;

  // 수정 불가능한 속성 제거
  delete $set.password;
  delete $set.replies;

  // 수정이 되면 관리자가 다시 확인 할 수 있도록 함
  $set.confirm = false;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    if (!isMyQnA(doc, user, password)) return next(FORBIDDEN);

    await doc.updateOne({ $set });
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const updateReply = async (req, res, next) => {
  const { params: { id, replyId }, body: { content, password }, user } = req;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);

    const reply = doc.replies.find(r => String(r._id) === String(replyId));
    if (!reply) return next(REPLY_NOT_FOUND);

    // 본인이 작성한 댓글이 아니면 수정 권한이 없음
    if (user) {
      if (String(reply.writer) !== String(user.info)) return next(FORBIDDEN);
    } else {
      if (reply.writer) return next(FORBIDDEN);
    }

    if (!isMyQnA(doc, user, password) && user && hasPermission(user, 'qna')) {
      doc.confirm = true;
      const writer = doc.writer ? await UserInfo.findById(doc.writer) : doc.writerInfo;
      if (writer && writer.email) sendMail('E-Help Desk 답변 수정 알림', createQnAContent(doc), writer.email);
    }

    reply.content = content;
    await doc.save();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const confirm = async (req, res, next) => {
  const { params: { id }, body: { confirm } } = req;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    doc.confirm = confirm;
    await doc.save();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const removeQnA = async (req, res, next) => {
  const { params: { id } } = req;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    await doc.deleteOne();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const removeReply = async (req, res, next) => {
  const { params: { id, replyId }, body: { password } = {}, user } = req;

  try {
    const doc = await Qna.findById(id);
    if (!doc) return next(QNA_NOT_FOUND);
    if (!hasQnAPermission(doc, user, password)) return next(FORBIDDEN);
    const idx = doc.replies.findIndex(r => String(r._id) === String(replyId));
    if (idx === -1) return next(REPLY_NOT_FOUND);

    const reply = doc.replies[idx];
    // 본인이 작성한 댓글이 아니면 삭제 권한이 없음
    if (user) {
      if (String(reply.writer) !== String(user.info)) return next(FORBIDDEN);
    } else {
      if (reply.writer) return next(FORBIDDEN);
    }
    doc.replies.splice(idx, 1);
    await doc.save();
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

exports.getQnAs = getQnAs;
exports.getQnA = getQnA;
exports.getSimpleQnA = getSimpleQnA;
exports.createQnA = createQnA;
exports.addReply = addReply;
exports.checkPassword = checkPassword;
exports.updateQnA = updateQnA;
exports.updateReply = updateReply;
exports.confirm = confirm;
exports.removeQnA = removeQnA;
exports.removeReply = removeReply;

function hasQnAPermission(qna, user, password) {
  const writerId = qna.writer ? qna.writer._id || qna.writer : null;
  if (hasPermission(user, 'qna')) return true;
  else if (writerId && user && String(writerId) === String(user.info)) return true;
  else if (password && qna.authenticate(password)) return true;
  return false;
}

function isMyQnA(qna, user, password) {
  const writerId = qna.writer ? qna.writer._id || qna.writer : null;
  if (writerId && user && String(writerId) === String(user.info)) return true;
  else if (password && qna.authenticate(password)) return true;
  return false;
}

function createQnAContent(qna, edit = false) {
  return `<p>E-Help Desk에 문의한 질문에 대한 답변이 ${edit ? '수정되었습니다' : '게시되었습니다.'}.<br>
확인하고 싶은 경우 아래의 링크를 클릭하세요.</p>
<a href="${WEB_APP_HOST}/community/e-help/detail/${qna._id}">답변 확인</a>`;
}
