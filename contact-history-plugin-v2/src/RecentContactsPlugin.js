import React from 'react';
import { Actions, VERSION, View } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';

import reducers, { namespace } from './states';
import PendingButton from './components/PendingButton/PendingButton';

import AgentNotes from './components/AgentNotes/AgentNotes';
import RecentContactsNavButton from './components/RecentContactsNavButton';

import RecentContacts from './utils/RecentContacts';

import ContactHistory from './components/ContactHistoryView';
import DispositionDialog from './components/DispositionDialog';
import { updateTaskAndConversationsAttributes } from './utils/taskUtil'

const PLUGIN_NAME = 'RecentContactsPlugin';

export default class RecentContactsPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    this.registerReducers(manager);

    // Disable Pending/pause button since long_lived is deprecated
    // See other plugins or docs on how to implement "Parked" interactions
    // flex.TaskCanvasHeader.Content.add(<PendingButton key="chat-pending-button" />, {
    //   sortOrder: 1,
    //   if: (props) =>
    //     props.channelDefinition.capabilities.has('Chat') && props.task.taskStatus === 'assigned',
    // });

    flex.AgentDesktopView.Panel2.Content.replace(<AgentNotes key="agent-notes" />);

    //Recent Contacts side nav button and new view
    flex.SideNav.Content.add(
      <RecentContactsNavButton key="recent-contacts-sidenav-button" />, { sortOrder: 2 }
    );

    // Add view to the ViewCollection
    flex.ViewCollection.Content.add(
      <View name="recent-contacts-view" key="recent-contacts-view">
        <ContactHistory key="co-recent-view" />
      </View>
    );
    //Init Redux from local storage
    RecentContacts.initContactHistory();

    flex.AgentDesktopView.Panel1.Content.add(<DispositionDialog
      key="disposition-modal"
    />, { sortOrder: 100 });

    manager.workerClient.on("reservationCreated", (reservation) => {
      console.log(PLUGIN_NAME, 'reservationCreated: ', reservation);

      reservation.on('accepted', async (reservation) => {
        console.log(PLUGIN_NAME, 'Reservation Accepted: ', reservation);

        manager.conversationsClient.on("conversationAdded", async (conversation) => {
          try {
            console.log(PLUGIN_NAME, 'Conversation Added.');
            let convoAttributes = await conversation.getAttributes();
            console.log(PLUGIN_NAME, 'Conversation Added. Got Attributes:', convoAttributes);
            // TODO: How to check if this was a parked/pending conversation
            // let newAttr = {};
            // let convData = {}
            // if (convoAttributes.notes) newAttr.previousNotes = convoAttributes.notes;
            // if (convoAttributes.caseId) convData.case = convoAttributes.caseId;
            // await updateTaskAndConversationsAttributes(reservation.task, newAttr, convData);

          } catch (e) {
            console.log(PLUGIN_NAME, 'getChannel failed', e);
          }
        });
      });

      reservation.on('wrapup', reservation => {
        Actions.invokeAction('SetComponentState', {
          name: 'DispositionDialog',
          state: { isOpen: true }
        });
      });

      reservation.on('completed', reservation => {
        RecentContacts.addContact(reservation);
      });
    });
  }


  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint: disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    manager.store.addReducer(namespace, reducers);
  }
}