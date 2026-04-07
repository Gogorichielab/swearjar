function json(status, payload) {
  return {
    status,
    jsonBody: payload,
    headers: {
      'Content-Type': 'application/json'
    }
  };
}

function ok(data, status = 200) {
  return json(status, {
    success: true,
    data
  });
}

function fail(status, code, message, details) {
  return json(status, {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

module.exports = {
  ok,
  fail
};
