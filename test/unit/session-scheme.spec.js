'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('@adonisjs/lucid/lib/iocResolver').setFold(require('@adonisjs/fold'))

const test = require('japa')
const { ioc } = require('@adonisjs/fold')
const Model = require('@adonisjs/lucid/src/Lucid/Model')

const { session: Session } = require('../../src/Schemes')
const { lucid: LucidSerializer } = require('../../src/Serializers')
const setup = require('./setup')

test.group('Schemes - Session', (group) => {
  setup.databaseHook(group)
  setup.hashHook(group)

  test('throw exception when unable to find user', async (assert) => {
    assert.plan(1)

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer()
    lucid.setConfig(config)

    const session = new Session()
    session.setOptions(config, lucid)
    try {
      await session.validate('foo@bar.com', 'secret')
    } catch ({ message }) {
      assert.equal(message, 'E_USER_NOT_FOUND: Cannot find user with email as foo@bar.com')
    }
  })

  test('throw exception when password doesn\'t match', async (assert) => {
    assert.plan(1)

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()
    session.setOptions(config, lucid)
    await User.create({ email: 'foo@bar.com', password: 'supersecret' })

    try {
      await session.validate('foo@bar.com', 'secret')
    } catch ({ message }) {
      assert.equal(message, 'E_PASSWORD_MISMATCH: Cannot verify user password')
    }
  })

  test('return true when user credentails are correct', async (assert) => {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()
    session.setOptions(config, lucid)
    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const validated = await session.validate('foo@bar.com', 'supersecret')
    assert.isTrue(validated)
  })

  test('return user instance when user credentails are correct', async (assert) => {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()
    session.setOptions(config, lucid)
    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const user = await session.validate('foo@bar.com', 'supersecret', true)
    assert.instanceOf(user, User)
  })

  test('set user session cookie', async (assert) => {
    let httpSession = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)

    session.setCtx({ session: {
      put (key, value) {
        httpSession = { key, value }
      }
    } })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const user = await session.attempt('foo@bar.com', 'supersecret')
    assert.instanceOf(user, User)
    assert.deepEqual(httpSession, { key: 'adonis-auth', value: 1 })
  })

  test('set remember me cookie when remeber me is set to true', async (assert) => {
    let rememberMeToken = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)

    session.setCtx({
      session: {
        put () {}
      },
      response: {
        cookie (key, value, options) {
          rememberMeToken = { key, value, options }
        }
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const user = await session.remember(true).attempt('foo@bar.com', 'supersecret')
    assert.instanceOf(user, User)
    assert.equal(rememberMeToken.key, 'adonis-remember-token')
    assert.isDefined(rememberMeToken.value)
    assert.deepEqual(rememberMeToken.options, { expires: 157788000000 })
  })

  test('customize remember me duration', async (assert) => {
    let rememberMeToken = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)

    session.setCtx({
      session: {
        put () {}
      },
      response: {
        cookie (key, value, options) {
          rememberMeToken = { key, value, options }
        }
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const user = await session.remember('10 hrs').attempt('foo@bar.com', 'supersecret')
    assert.instanceOf(user, User)
    assert.equal(rememberMeToken.key, 'adonis-remember-token')
    assert.isDefined(rememberMeToken.value)
    assert.deepEqual(rememberMeToken.options, { expires: 36000000 })
  })

  test('do not set remember me token when false is passed', async (assert) => {
    let rememberMeToken = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)

    session.setCtx({
      session: {
        put () {}
      },
      response: {
        cookie (key, value, options) {
          rememberMeToken = { key, value, options }
        }
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const user = await session.remember(false).attempt('foo@bar.com', 'supersecret')
    assert.instanceOf(user, User)
    assert.isNull(rememberMeToken)
  })

  test('set remember me cookie in milliseconds', async (assert) => {
    let rememberMeToken = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)

    session.setCtx({
      session: {
        put () {}
      },
      response: {
        cookie (key, value, options) {
          rememberMeToken = { key, value, options }
        }
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const user = await session.remember(3000).attempt('foo@bar.com', 'supersecret')
    assert.instanceOf(user, User)
    assert.equal(rememberMeToken.key, 'adonis-remember-token')
    assert.isDefined(rememberMeToken.value)
    assert.deepEqual(rememberMeToken.options, { expires: 3000 })
  })

  test('throw exception when re-using same instance to authenticate user twice', async (assert) => {
    assert.plan(1)
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put () {}
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    await session.attempt('foo@bar.com', 'supersecret')

    try {
      await session.attempt('foo@bar.com', 'supersecret')
    } catch ({ message }) {
      assert.equal(message, 'E_CANNOT_LOGIN: Cannot login multiple users at once, since a user is already logged in')
    }
  })

  test('throw exception when user doesn\'t have an id', async (assert) => {
    assert.plan(1)
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put () {}
      }
    })

    const user = new User()

    try {
      await session.login(user)
    } catch ({ message }) {
      assert.equal(message, 'E_CANNOT_LOGIN: Cannot login user, since user id is not defined')
    }
  })

  test('throw exception when loginViaId is unable to find user id', async (assert) => {
    assert.plan(1)
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put () {}
      }
    })

    try {
      await session.loginViaId(1)
    } catch ({ message }) {
      assert.equal(message, 'E_USER_NOT_FOUND: Cannot find user with id as 1')
    }
  })

  test('set session when able to find user with id', async (assert) => {
    let httpSession = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put (key, value) {
          httpSession = { key, value }
        }
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    await session.loginViaId(1)
    assert.deepEqual(httpSession, { key: 'adonis-auth', value: 1 })
  })

  test('set user property when login is successful', async (assert) => {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put () {}
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    await session.loginViaId(1)
    assert.instanceOf(session.user, User)
  })

  test('add query constraints when trying to login user', async (assert) => {
    assert.plan(1)

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put () {}
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    try {
      await session.query((builder) => {
        builder.where('active', true)
      }).attempt('foo@bar.com', 'supersecret')
    } catch ({ message }) {
      assert.equal(message, 'E_USER_NOT_FOUND: Cannot find user with email as foo@bar.com')
    }
  })

  test('return false when user session cookie is missing', async (assert) => {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        get () {
          return null
        }
      },
      request: {
        cookie () {}
      }
    })

    const logged = await session.check()
    assert.isFalse(logged)
  })

  test('return false when session is found but unable to find user', async (assert) => {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        get () {
          return '2'
        }
      },
      request: {
        cookie () {}
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret' })
    const logged = await session.check()
    assert.isFalse(logged)
  })

  test('return true when user session is missing but remeber token is found', async (assert) => {
    let httpSession = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        get () {
          return null
        },
        put (key, value) {
          httpSession = { key, value }
        }
      },
      request: {
        cookie () {
          return '101'
        }
      }
    })

    await User.create({ email: 'foo@bar.com', password: 'supersecret', remember_me_token: '101' })
    const logged = await session.check()
    assert.isTrue(logged)
    assert.instanceOf(session.user, User)
    assert.deepEqual(httpSession, { key: 'adonis-auth', value: 1 })
  })

  test('return user when already logged in', async (assert) => {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {},
      request: {}
    })

    session.user = { id: 1 }
    const user = await session.getUser()
    assert.deepEqual(user, { id: 1 })
  })

  test('logout user', async (assert) => {
    let httpSession = null

    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const session = new Session()

    session.setOptions(config, lucid)
    session.setCtx({
      session: {
        put (key, value) {
          httpSession = { key, value }
        },
        forget (key) {
          httpSession = { key }
        }
      },
      response: {
        clearCookie (key) {
          httpSession.clearCookie = { key }
        }
      }
    })

    const user = await User.create({ email: 'foo@bar.com', password: 'secret' })
    await session.login(user)
    session.logout()
    assert.isNull(session.user)
    assert.deepEqual(httpSession, { key: 'adonis-auth', clearCookie: { key: 'adonis-remember-token' } })
  })
})