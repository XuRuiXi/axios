const defaultConfig = {
  baseURL: '',
  timeout: '',
  headers: {
    'Accept': '*',
    'Content-Type': 'application/json;charset=utf-8'
  }
}


function xhrAdapter(config) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(config.type, `${config.baseURL}${config.url}`, true);  //建立间接，要求异步响应
    Object.keys(config.headers).forEach(i => {
      xhr.setRequestHeader(i, config.headers[i]);
    })
    xhr.onreadystatechange = function () {  //绑定响应状态事件监听函数
      if (xhr.readyState == 4) {  //监听readyState状态
        if (xhr.status >= 200 && xhr.status < 300) {
          let data;
          try {
            data = JSON.parse(xhr.response);
          } catch(err) {
            data = xhr.response;
          }
          resolve(data);
        }
        reject('请求失败')
      }
    }
    xhr.send(JSON.stringify(config.data));  //发送请求

    if (config.cancelToken) {
      config.cancelToken.promise.then(() => {
        xhr.abort();
      })
    }

    if (config.signal) {
      config.signal.addEventListener('abort', function (e) {
        xhr.abort();
      })
    }

    if (config.timeout) {
      setTimeout(() => {
        xhr.abort();
      }, config.timeout)
    }

  })
}

function dispatcher(config) {
  return xhrAdapter(config).then(
    res => {
      return res;
    }
  )
}

function Axios(defaults) {
  this.defaults = defaults;
  this.interceptor = {
    request: new InterceptorManager(),
    response: new InterceptorManager(),
  }
}

function InterceptorManager() {
  this.handlers = [];
}

InterceptorManager.prototype.use = function (onFulFilled, onRejected) {
  this.handlers.push({
    onFulFilled,
    onRejected
  })
}

Axios.prototype.request = function (config) {

  config = mergeConfig(this.defaults, config);
  
  let promise = Promise.resolve(config);
  const dispatcherList = [dispatcher, undefined];
  this.interceptor.request.handlers.forEach(i => {
    dispatcherList.unshift(i.onFulFilled, i.onRejected);
  })

  this.interceptor.response.handlers.forEach(i => {
    dispatcherList.push(i.onFulFilled, i.onRejected);
  })
  
  while (dispatcherList.length) {
    promise = promise.then(dispatcherList.shift(), dispatcherList.shift())
  }
  return promise;
};


['POST', 'GET', 'DELETE', 'PUT'].forEach(i => {
  const type = i.toLowerCase()
  Axios.prototype[type] = function(config) {
    config.type = i;
    return Axios.prototype.request.call(this, config);
  }
})

Axios.prototype.CancelToken = function (executor) {
  let candel;
  this.promise = new Promise((resolve) => {
    candel = resolve;
  })
  executor(function () {
    candel();
  });
}

function createInstance(defaults) {
  const context = new Axios(defaults);
  const instance = Axios.prototype.request.bind(context);

  Object.keys(context).forEach(i => {
    instance[i] = context[i];
  })

  Object.keys(Axios.prototype).forEach(i => {
    instance[i] = Axios.prototype[i];
  })

  instance.create = function(instanceConfig) {
    return createInstance(mergeConfig(defaults, instanceConfig));
  };

  return instance;
}
function mergeConfig(obj1, obj2) {
  const newObj = JSON.parse(JSON.stringify(obj1))
  Object.keys(obj2).forEach(key => {
    let type1 = typeof newObj[key] === 'object'
    let type2 = typeof obj2[key] === 'object'
    if (type1 && type2) {
      newObj[key] = mergeConfig(newObj[key], obj2[key])
    } else {
      newObj[key] = obj2[key];
    }
  })
  return newObj;
}

const axios = createInstance(defaultConfig);

axios.interceptor.request.use(
  config => {
    console.log(config, 'config----------1');
    return config;
  }
  ,
  reason => {
    throw reason;
  }
)

axios.interceptor.request.use(
  config => {
    console.log(config, 'config----------2');
    return config;
  }
  ,
  reason => {
    throw reason;
  }
)

axios.interceptor.response.use(
  value => {
    console.log(value, 'value----------1');
    return value;
  }
  ,
  reason => {
    throw reason;
  }
)

axios.interceptor.response.use(
  value => {
    console.log(value, 'value----------2');
    return value;
  }
  ,
  reason => {
    throw reason;
  }
)

axios({
  url: 'http://localhost:1111/getHi',
  type: 'POST',
  data: {
    pageNum: 1,
  },
})
  .then(
    res => {
      console.log(res);
    },
    reason => {
      console.log(reason);
    }
  )


const axios2 = axios.create({
  baseURL: 'http://localhost:1111'
});

axios2({
  url: '/getHi',
  type: 'POST',
  data: {
    pageNum: 2,
  },
})
  .then(
    res => {
      console.log(res);
    },
    reason => {
      console.log(reason);
    }
  )


  axios2.get({
    url: '/getHi',
    data: {
      pageNum: 2,
    },
  })
    .then(
      res => {
        console.log(res);
      },
      reason => {
        console.log(reason);
      }
    )