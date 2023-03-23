**从0实现axios。**   
**目标：**
- 支持修改默认配置
- 支持拦截器
- 支持创建多个axios实例
- 支持取消请求

**Axios类**

分析：在日常使用过程中，我们的axios实例上，都有一个defaults和interceptor属性，用来修改默认的配置和接收拦截器。每个实例都有独立的defaults和interceptor。所以，它们不能被继承。

```js
// 定义一个默认配置常量
const defaultConfig = {
  baseURL: '',
  timeout: '',
  headers: {
    'Accept': '*',
    'Content-Type': 'application/json;charset=utf-8'
  }
}

function Axios(defaults) {
  // 每次new的时候，设置默认配置
  this.defaults = defaults;
  this.interceptor = {
    request: {},
    response: {},
  }
}

```

**Axios原型上的方法**

Axios原型上最重要的是request方法，其他的例如post,get...都是基于request，只是改变对应的请求类型而已。

```js
Axios.prototype.request = function(config) {
  // 真正的配置信息，需要合并默认配置和用户的配置参数
  config = mergeConfig(this.defaults, config);
  console.log(config);
}

['POST', 'GET', 'DELETE', 'PUT'].forEach(i => {
  const type = i.toLowerCase()
  Axios.prototype[type] = function(config) {
    config.type = i;
    // 使用call，让request的this指向axios实例。
    return Axios.prototype.request.call(this, config);
  }
})
```

**axios实例**

分析：我们可以将直接导入的axios作为函数使用，例如axios({})。我们也可以使用axios上的方法，例如axios.post()。

那是因为导出的axios本质上就是Axios.prototype.request，所以我们可以直接像axios.request那样去使用。但是这个axios对比request多了一些属性。

```js

function createInstance(defaults) {
  // 创建Axios的实例，为了让Axios.prototype.request的this指向它。方便调用实例的方法以及获取其属性。
  const context = new Axios(defaults);
  const instance = Axios.prototype.request.bind(context);

  // 将context的属性和Axios原型上的方法，赋值给instance
  Object.keys(context).forEach(i => {
    instance[i] = context[i];
  })
  Object.keys(Axios.prototype).forEach(i => {
    instance[i] = Axios.prototype[i];
  })

  // 往instance上添加create方法，用来创建新的实例。
  instance.create = function(instanceConfig) {
    return createInstance(mergeConfig(defaults, instanceConfig));
  };

  return instance;
}
// 深度合并对象的方法
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

export default axios;

```

第一阶段分析：  
我们常用的写法如下。导出的axios是Axios的实例。
```js
import axios from 'axios';
axios({
  url: 'xxx',
  type: 'POST',
  data: {}
})
```

但是，我们也可以使用create方法，创建不同的互不影响的axios实例。
```js
import axios from 'axios';

const axios1 = axios.create({
  baseURL: 'http://localhost/'
})
const axios2 = axios.create({
  baseURL: 'http://www.xuruixi.com/'
})
axios1({
  url: 'xxx',
  type: 'POST',
  data: {}
})
axios2({
  url: 'xxx',
  type: 'POST',
  data: {}
})
```

**request方法**

代码如下，理解这段代码，需要对Promise有一定的了解。  
分析：  
- 我们声明的let promise = Promise.resolve(config)。那么promise必然是一个fulfilled状态的promise。
- promise = promise.then(dispatcherList.shift(), dispatcherList.shift())。因为promise的初始状态是fulfilled，所以promise第一次会执行onFulFilled，也就是dispatcher。而dispatcher也是一个promise，它的运行决定了最后的promise的状态。
```js
Axios.prototype.request = function (config) {
  // 真正的配置信息，需要合并默认配置和用户的配置参数
  config = mergeConfig(this.defaults, config);
  let promise = Promise.resolve(config);
  const dispatcherList = [dispatcher, undefined];
  
  while (dispatcherList.length) {
    promise = promise.then(dispatcherList.shift(), dispatcherList.shift())
  }
  return promise;
};

function dispatcher(config) {
  return xhrAdapter(config).then(
    res => {
      return res;
    }
  )
};

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
  })
}
```
**拦截器**

首先我们写出拦截器的使用方法如下。axios.interceptor.request和axios.interceptor.response都有一个use方法。
```js
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

function Axios(defaults) {
  // 每次new的时候，设置默认配置
  this.defaults = defaults;
  this.interceptor = {
    request: {},
    response: {},
  }
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

// use方法就是收集onFulFilled, onRejected，以对象的形式添加到各自的handlers数组里面。

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
  // 把handlers上的函数放进dispatcherList里面。。因为dispatcher是真正的发送请求。
  // 所以：把请求前的拦截器放在数组的左边，请求后的拦截器放在数组的右边。这就形成了
  // [...onFulFilled, onRejected, dispatcher, undefined, onFulFilled, onRejected...]
  this.interceptor.request.handlers.forEach(i => {
    dispatcherList.unshift(i.onFulFilled, i.onRejected);
  })

  this.interceptor.response.handlers.forEach(i => {
    dispatcherList.push(i.onFulFilled, i.onRejected);
  })
  
  // 根据Promise的用法，每个onFulFilled或者onRejected会根据promise的状态，从左到右依次执行。所以在左边的就是请求前的promise，右边就是请求后的promise
  while (dispatcherList.length) {
    promise = promise.then(dispatcherList.shift(), dispatcherList.shift())
  }
  return promise;
};

```

**取消请求和超时**

第一种使用方法
```js
const controller = new AbortController();
axios({
  url: 'http://localhost:1111/getHi',
  type: 'POST',
  data: {
    pageNum: 1,
  },
  signal: controller.signal,
})
  .then(
    res => {
      console.log(res);
    },
    reason => {
      console.log(reason);
    }
  )

  setTimeout(() => {
    controller.abort()
  })
```
第二种使用方法
```js
let cancel;
axios({
  url: 'http://localhost:1111/getHi',
  type: 'POST',
  data: {
    pageNum: 1,
  },
  cancelToken: new axios.CancelToken(function(c) {
    cancel = c;
  })
})
  .then(
    res => {
      console.log(res);
    },
    reason => {
      console.log(reason);
    }
  )

  setTimeout(() => {
    cancel()
  })
```

我们首先实现第一种：  
分析：  
AbortController 是表示一个控制器对象，它可以终止fetch请求。  
在axios上的用法和fetch上类似。  
在axios内部，我们通过实例对象的singal的属性，监听abort事件，然后触发xhr的取消函数就行。

```js
function xhrAdapter(config) {
  ...
  const xhr = new XMLHttpRequest();
  if (config.signal) {
    config.signal.addEventListener('abort', function (e) {
      xhr.abort();
    })
  }
}
    
```

第二种：  
首先Axios的原型上定义CancelToken方法。接收一个executor。这个executor就是new axios.CancelToken时，传入的函数。  
在CancelToken内部，我们在构造函数。往它的实例上挂载一个promise属性，这个promise属性是pending状态的，因为此时它并没有被resolve或者reject。

```js
Axios.prototype.CancelToken = function (executor) {
  let candel;
  this.promise = new Promise((resolve) => {
    candel = resolve;
  })
  executor(function () {
    candel();
  });
}
```

```js
// 注意这段函数，我们通过executor，拿到CancelToken内部的函数function() { candel() }
// 并且赋值给了cancel。。。当cancel执行的之后，实例上的promise的状态就由pending变为fulfilled
new axios.cancelToken(function(c) {
    cancel = c;
  })
```

利用实例的promise，我们在xhrAdapter这样写。  
当promise变为fulfilled，然后onFulFilled就被执行。
```js
function xhrAdapter(config) {
  ...
  const xhr = new XMLHttpRequest();
  if (config.cancelToken) {
    config.cancelToken.promise.then(() => {
      xhr.abort();
    })
  }
}
```

**超时**

```js
function xhrAdapter(config) {
  ...
  const xhr = new XMLHttpRequest();
  if (config.timeout) {
    setTimeout(() => {
      xhr.abort();
    }, config.timeout)
  }
}
```