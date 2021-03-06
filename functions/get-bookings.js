const returnMessage = require('./utils/return-message')
const moment = require('moment')

/**
 * GET /api/get-bookings/{visitorId}
 * Description: Lists the bookings of the visitor
 * Body:
 *  string visitorId: the id of the visitor
 *  int skip: how many to skip
 *  int load: how many to load
 */

exports.handler = async (event) => {
  console.log('Function `getBookings` invoked')
  if (!require('./utils/check-tokens')(event.headers, false)) return returnMessage(401, 'Unauthorised')

  let params = require('./utils/extract-params')(event.path)
  let data = {}
  data.visitorId = params[params.length - 1]
  //todo get skip/load from query?
  // data.skip = params[params.length - 2]
  // data.load = params[params.length - 1]

  if (!data.visitorId) {
    return returnMessage(400, 'Invalid User ID')
  }

  let skip = data.skip ? Number.parseInt(data.skip) : 0
  let load = data.load ? Number.parseInt(data.load) : 10

  let mongo = await require('./utils/instantiate-database')()
  const Booking = require('./models/booking.model')
  require('./models/slot.model')
  require('./models/place.model')
  let bookings = await Booking.find({ visitorId: data.visitorId }).skip(skip).limit(load).populate({
    path: 'slotId',
    populate: { path: 'placeId' }
  })
  bookings.sort((a, b) => a.slotId.starts - b.slotId.starts)

  let output = []

  const DATE_FORMAT = 'DD.MM.YYYY'
  const TIME_FORMAT = 'HH:mm'
  for (const booking of bookings) {
    let o = output[moment(booking.slotId.starts).format(DATE_FORMAT)]
    let obj = {
      name: booking.slotId.placeId.name,
      type: require('./utils/slot-types').findById(booking.slotId.typeId).name,
      startTime: moment(booking.slotId.starts).format(TIME_FORMAT),
      endTime: moment(booking.slotId.ends).format(TIME_FORMAT),
      visitors: booking.friendsNumber,
      occupiedSlots: booking.slotId.occupiedSlots,
      maxSlots: booking.slotId.maxVisitors,
      slotId: booking.slotId._id,
      placeId: booking.slotId.placeId._id
    }
    if (o) o.push(obj)
    else output[moment(booking.slotId.starts).format(DATE_FORMAT)] = [obj]
  }

  await mongo.disconnect()
  return require('./utils/return-object')({ visits: { ...output } })
}
