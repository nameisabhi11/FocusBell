export default defineBackground(() => {
  console.log(
    'FocusBell background service worker started'
  )

  type AlarmData = {
    id: string
    name: string
    time: string
    repeat: string
    enabled?: boolean
    sound?: string
  }

  type NotificationData = {
    originalAlarmId: string
    windowId?: number
  }

  // =========================================
  // OCCURRENCE TRACKING
  // =========================================

  const getOccurrenceKey = (
    alarmId: string,
    date: Date
  ) => {
    const year = date.getFullYear()

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    const day = String(
      date.getDate()
    ).padStart(2, '0')

    return `focusbellOccurrence_${alarmId}_${year}-${month}-${day}`
  }

  const markOccurrence = async (
    alarmId: string,
    date: Date,
    status: 'triggered' | 'missed'
  ) => {
    const key = getOccurrenceKey(
      alarmId,
      date
    )

    await browser.storage.local.set({
      [key]: status,
    })
  }

  const getOccurrenceStatus = async (
    alarmId: string,
    date: Date
  ) => {
    const key = getOccurrenceKey(
      alarmId,
      date
    )

    const result =
      await browser.storage.local.get(key)

    return result[key] as
      | string
      | undefined
  }

  // =========================================
  // ADD ALARM TO PAST ALARMS
  // =========================================

  const addToHistory = async (
    alarm: AlarmData,
    reason: string
  ) => {
    try {
      const result =
        await browser.storage.local.get(
          'alarmHistory'
        )

      const history =
        (result.alarmHistory || []) as {
          id: string
          name: string
          time: string
          repeat: string
          dismissedAt: string
        }[]

      const historyItem = {
        id: `${alarm.id}-${Date.now()}`,
        name: alarm.name,
        time: alarm.time,
        repeat: alarm.repeat,
        dismissedAt: new Date().toLocaleString(),
      }

      await browser.storage.local.set({
        alarmHistory: [
          historyItem,
          ...history,
        ],
      })

      console.log(
        `📝 Alarm added to Past Alarms: ${alarm.name} (${reason})`
      )
    } catch (error) {
      console.error(
        '❌ Could not add alarm to history:',
        error
      )
    }
  }

  // =========================================
  // STOP ALARM FROM NOTIFICATION BUTTON
  // =========================================

  browser.notifications.onButtonClicked.addListener(
    async (
      notificationId,
      buttonIndex
    ) => {
      try {
        console.log(
          '🔘 Notification button clicked:',
          notificationId,
          buttonIndex
        )

        if (buttonIndex !== 0) {
          return
        }

        const storageKey =
          `focusbellNotification_${notificationId}`

        const result =
          await browser.storage.local.get(
            storageKey
          )

        const notificationData =
          result[storageKey] as
            | NotificationData
            | undefined

        if (!notificationData) {
          console.log(
            '⚠️ FocusBell notification data not found'
          )

          return
        }

        console.log(
          '🛑 STOP ALARM button pressed'
        )

        // FIND ORIGINAL ALARM

        const alarmsResult =
          await browser.storage.local.get(
            'alarms'
          )

        const alarms =
          (alarmsResult.alarms || []) as AlarmData[]

        const currentAlarm =
          alarms.find(
            (item) =>
              item.id ===
              notificationData.originalAlarmId
          )

        // ADD TO HISTORY

        if (currentAlarm) {
          await addToHistory(
            currentAlarm,
            'Stopped from notification'
          )
        }

        // CLOSE ALARM POPUP

        if (
          typeof notificationData.windowId ===
          'number'
        ) {
          try {
            await browser.windows.remove(
              notificationData.windowId
            )

            console.log(
              '🪟 Alarm popup closed'
            )
          } catch {
            console.log(
              'ℹ️ Alarm popup was already closed'
            )
          }
        }

        // CLEAR NOTIFICATION

        try {
          await browser.notifications.clear(
            notificationId
          )

          console.log(
            '🔕 Notification cleared'
          )
        } catch {
          console.log(
            'ℹ️ Notification already closed'
          )
        }

        // ONCE ALARM

        if (
          currentAlarm &&
          currentAlarm.repeat === 'Once'
        ) {
          await browser.alarms.clear(
            notificationData.originalAlarmId
          )

          const updatedAlarms =
            alarms.filter(
              (item) =>
                item.id !==
                notificationData.originalAlarmId
            )

          await browser.storage.local.set({
            alarms: updatedAlarms,
          })

          console.log(
            '🗑️ Once alarm removed'
          )
        }

        // REPEATING ALARM

        if (
          currentAlarm &&
          currentAlarm.repeat !== 'Once'
        ) {
          console.log(
            `🔁 ${currentAlarm.repeat} alarm remains active`
          )
        }

        await browser.storage.local.remove(
          storageKey
        )

        console.log(
          '✅ Stop Alarm completed'
        )
      } catch (error) {
        console.error(
          '❌ Stop Alarm failed:',
          error
        )
      }
    }
  )

  // =========================================
  // GET NEXT OCCURRENCE
  // =========================================

  const getNextOccurrence = (
    alarm: AlarmData,
    fromDate: Date
  ) => {
    const timeParts =
      alarm.time.split(':')

    const hours = Number(timeParts[0])
    const minutes = Number(timeParts[1])

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return null
    }

    const next = new Date(fromDate)

    next.setHours(hours)
    next.setMinutes(minutes)
    next.setSeconds(0)
    next.setMilliseconds(0)

    // EVERY DAY

    if (alarm.repeat === 'Every day') {
      if (
        next.getTime() <= fromDate.getTime()
      ) {
        next.setDate(
          next.getDate() + 1
        )
      }

      return next
    }

    // EVERY WEEK

    if (alarm.repeat === 'Every week') {
      if (
        next.getTime() <= fromDate.getTime()
      ) {
        next.setDate(
          next.getDate() + 7
        )
      }

      return next
    }

    // EVERY WEEKDAY

    if (alarm.repeat === 'Every weekday') {
      if (
        next.getTime() <= fromDate.getTime()
      ) {
        next.setDate(
          next.getDate() + 1
        )
      }

      while (
        next.getDay() === 0 ||
        next.getDay() === 6
      ) {
        next.setDate(
          next.getDate() + 1
        )
      }

      return next
    }

    return next
  }

  // =========================================
  // MISSED ALARM CHECK
  // =========================================

  const checkMissedAlarms = async () => {
    try {
      console.log(
        '⏳ Waiting before missed alarm check...'
      )

      // Allow normal alarm events to execute first.

      await new Promise((resolve) =>
        setTimeout(resolve, 60000)
      )

      console.log(
        '🔎 Checking for missed alarms...'
      )

      const result =
        await browser.storage.local.get(
          'alarms'
        )

      const alarms =
        (result.alarms || []) as AlarmData[]

      if (alarms.length === 0) {
        console.log(
          'ℹ️ No alarms found'
        )

        return
      }

      const now = new Date()

      for (const alarm of alarms) {
        if (alarm.enabled === false) {
          continue
        }

        const timeParts =
          alarm.time.split(':')

        const hours = Number(timeParts[0])
        const minutes = Number(timeParts[1])

        if (
          Number.isNaN(hours) ||
          Number.isNaN(minutes)
        ) {
          continue
        }

        const scheduledToday =
          new Date(now)

        scheduledToday.setHours(hours)
        scheduledToday.setMinutes(minutes)
        scheduledToday.setSeconds(0)
        scheduledToday.setMilliseconds(0)

        const elapsed =
          now.getTime() -
          scheduledToday.getTime()

        // Only consider alarms missed
        // after the grace period.

        if (elapsed < 60000) {
          continue
        }

        // WEEKDAY CHECK

        if (alarm.repeat === 'Every weekday') {
          const day = now.getDay()

          if (day === 0 || day === 6) {
            continue
          }
        }

        // CHECK WHETHER ALREADY PROCESSED

        const occurrenceStatus =
          await getOccurrenceStatus(
            alarm.id,
            scheduledToday
          )

        if (occurrenceStatus) {
          console.log(
            `✅ Already processed: ${alarm.name} (${occurrenceStatus})`
          )

          continue
        }

        // CHECK CHROME ALARM

        const browserAlarm =
          await browser.alarms.get(
            alarm.id
          )

        if (
          browserAlarm &&
          browserAlarm.scheduledTime >
            now.getTime()
        ) {
          console.log(
            `✅ Future occurrence already scheduled: ${alarm.name}`
          )

          continue
        }

        // MARK AS MISSED BEFORE NOTIFICATION

        await markOccurrence(
          alarm.id,
          scheduledToday,
          'missed'
        )

        console.log(
          `⚠️ Missed alarm detected: ${alarm.name}`
        )

        // ADD TO HISTORY

        await addToHistory(
          alarm,
          'Missed alarm'
        )

        // MISSED NOTIFICATION

        await browser.notifications.create({
          type: 'basic',

          iconUrl:
            browser.runtime.getURL(
              '/icon/128.png'
            ),

          title: 'FocusBell',

          message:
            `${alarm.name} was missed.`,

          requireInteraction: true,
        })

        console.log(
          '🔔 Missed alarm notification created'
        )

        // ONCE ALARM

        if (alarm.repeat === 'Once') {
          await browser.alarms.clear(
            alarm.id
          )

          const updatedAlarms =
            alarms.filter(
              (item) =>
                item.id !== alarm.id
            )

          await browser.storage.local.set({
            alarms: updatedAlarms,
          })

          console.log(
            `🗑️ Missed Once alarm removed: ${alarm.name}`
          )

          continue
        }

        // REPEATING ALARM

        const next =
          getNextOccurrence(
            alarm,
            now
          )

        if (next) {
          await browser.alarms.clear(
            alarm.id
          )

          await browser.alarms.create(
            alarm.id,
            {
              when: next.getTime(),
            }
          )

          console.log(
            `🔁 Next occurrence: ${next.toLocaleString()}`
          )
        }
      }
    } catch (error) {
      console.error(
        '❌ Missed alarm check failed:',
        error
      )
    }
  }

  // =========================================
  // CHECK WHEN SERVICE WORKER STARTS
  // =========================================

  checkMissedAlarms()

  // =========================================
  // ALARM TRIGGER
  // =========================================

  browser.alarms.onAlarm.addListener(
    async (alarm) => {
      console.log(
        '⏰ Alarm triggered:',
        alarm.name
      )

      try {
        const snoozeKey =
          `snooze_${alarm.name}`

        const snoozeResult =
          await browser.storage.local.get(
            snoozeKey
          )

        const snoozeData =
          snoozeResult[snoozeKey] as
            | {
                originalAlarmId: string
                name: string
                repeat: string
                sound: string
              }
            | undefined

        let originalAlarmId = alarm.name
        let alarmName = 'Alarm'
        let repeat = 'Once'
        let sound = 'alarm.mp3'
        let alarmTime = ''

        // =====================================
        // SNOOZED ALARM
        // =====================================

        if (snoozeData) {
          originalAlarmId =
            snoozeData.originalAlarmId

          alarmName =
            snoozeData.name

          repeat =
            snoozeData.repeat

          sound =
            snoozeData.sound ||
            'alarm.mp3'

          const result =
            await browser.storage.local.get(
              'alarms'
            )

          const alarms =
            (result.alarms || []) as AlarmData[]

          const originalAlarm =
            alarms.find(
              (item) =>
                item.id === originalAlarmId
            )
            

          if (!originalAlarm) {
            console.log(
              '🗑️ Original alarm no longer exists. Cancelling snooze.'
            )

            await browser.storage.local.remove(
              snoozeKey
            )

            return
          }
          alarmTime =
  originalAlarm.time || ''

          if (originalAlarm.enabled === false) {
            console.log(
              '🔕 Original alarm is disabled. Cancelling snooze.'
            )

            await browser.storage.local.remove(
              snoozeKey
            )

            return
          }

          console.log(
            '😴 Snoozed alarm is still valid'
          )

          await browser.storage.local.remove(
            snoozeKey
          )
        }

        // =====================================
        // NORMAL ALARM
        // =====================================

        else {
          const result =
            await browser.storage.local.get(
              'alarms'
            )

          const alarms =
            (result.alarms || []) as AlarmData[]

          const currentAlarm =
            alarms.find(
              (item) =>
                item.id === alarm.name
            )

          if (
            currentAlarm &&
            currentAlarm.enabled === false
          ) {
            console.log(
              '🔕 Alarm is disabled. Ignoring trigger.'
            )

            return
          }

          alarmName =
            currentAlarm?.name || 'Alarm'

          repeat =
            currentAlarm?.repeat || 'Once'

          sound =
            currentAlarm?.sound ||
            'alarm.mp3'
          alarmTime =
            currentAlarm?.time || ''

          // MARK NORMAL ALARM AS TRIGGERED

          const triggeredTime =
            new Date(
              alarm.scheduledTime || Date.now()
            )

          await markOccurrence(
            alarm.name,
            triggeredTime,
            'triggered'
          )

          console.log(
            `✅ Alarm marked as triggered: ${alarmName}`
          )
        }

        // =====================================
        // CREATE NOTIFICATION
        // =====================================

        const notificationId =
          await browser.notifications.create({
            type: 'basic',

            iconUrl:
              browser.runtime.getURL(
                '/icon/128.png'
              ),

            title: 'FocusBell',

            message:
              `${alarmName} is ringing!`,

            buttons: [
              {
                title: 'Stop Alarm',
              },
            ],

            requireInteraction: true,
          })

        console.log(
          '🔔 Notification created:',
          notificationId
        )

        // =====================================
        // CREATE ALARM POPUP
        // =====================================

        const alarmPage =
          browser.runtime.getURL(
            '/alarm.html'
          )

        const url =
          `${alarmPage}?alarmId=${encodeURIComponent(
            originalAlarmId
          )}&name=${encodeURIComponent(
            alarmName
          )}&repeat=${encodeURIComponent(
            repeat
          )}&sound=${encodeURIComponent(
            sound
          )}&notificationId=${encodeURIComponent(
            notificationId
          )}
          &time=${encodeURIComponent(alarmTime)}`
          

        const alarmWindow =
          await browser.windows.create({
            url,

            type: 'popup',

            width: 340,

            height: 460,

            focused: true,
          })

        console.log(
          '🪟 FocusBell alarm popup opened:',
          alarmWindow?.id
        )

        // =====================================
        // SAVE NOTIFICATION MAPPING
        // =====================================

        await browser.storage.local.set({
          [`focusbellNotification_${notificationId}`]:
            {
              originalAlarmId:
                originalAlarmId,

              windowId:
                alarmWindow?.id,
            },
        })

        console.log(
          '💾 Notification mapping saved'
        )

        // =====================================
        // SNOOZED ALARM
        // =====================================

        if (snoozeData) {
          return
          
        }

        // =====================================
        // EVERY WEEKDAY
        // =====================================

        if (repeat === 'Every weekday') {
          const result =
            await browser.storage.local.get(
              'alarms'
            )

          const alarms =
            (result.alarms || []) as AlarmData[]

          const currentAlarm =
            alarms.find(
              (item) =>
                item.id === originalAlarmId
            )

          if (!currentAlarm) {
            console.error(
              '❌ Original weekday alarm not found'
            )

            return
          }

          if (currentAlarm.enabled === false) {
            console.log(
              '🔕 Weekday alarm disabled'
            )

            return
          }

          const next =
            getNextOccurrence(
              currentAlarm,
              new Date()
            )

          if (!next) {
            return
          }

          await browser.alarms.create(
            originalAlarmId,
            {
              when: next.getTime(),
            }
          )

          console.log(
            `📅 Next weekday alarm scheduled for ${next.toLocaleString()}`
          )
        }
      } catch (error) {
        console.error(
          '❌ Alarm handling failed:',
          error
        )
      }
    }
  )
})