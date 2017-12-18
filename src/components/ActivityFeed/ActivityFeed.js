import React from 'react';
import { string, arrayOf, bool, func, number } from 'prop-types';
import { injectIntl, intlShape, FormattedMessage } from 'react-intl';
import { dropWhile } from 'lodash';
import classNames from 'classnames';
import { Avatar, InlineTextButton, ReviewRating } from '../../components';
import { formatDate } from '../../util/dates';
import { ensureTransaction, ensureUser, ensureListing } from '../../util/data';
import * as propTypes from '../../util/propTypes';
import * as log from '../../util/log';

import css from './ActivityFeed.css';

const Message = props => {
  const { message, intl } = props;
  const todayString = intl.formatMessage({ id: 'ActivityFeed.today' });
  return (
    <div className={css.message}>
      <Avatar className={css.avatar} user={message.sender} />
      <div>
        <p className={css.messageContent}>{message.attributes.content}</p>
        <p className={css.messageDate}>{formatDate(intl, todayString, message.attributes.at)}</p>
      </div>
    </div>
  );
};

Message.propTypes = {
  message: propTypes.message.isRequired,
  intl: intlShape.isRequired,
};

const OwnMessage = props => {
  const { message, intl } = props;
  const todayString = intl.formatMessage({ id: 'ActivityFeed.today' });
  return (
    <div className={css.ownMessage}>
      <div className={css.ownMessageContentWrapper}>
        <p className={css.ownMessageContent}>{message.attributes.content}</p>
      </div>
      <p className={css.ownMessageDate}>{formatDate(intl, todayString, message.attributes.at)}</p>
    </div>
  );
};

OwnMessage.propTypes = {
  message: propTypes.message.isRequired,
  intl: intlShape.isRequired,
};

const Review = props => {
  const { content, rating } = props;
  return (
    <div>
      <p className={css.reviewContent}>{content}</p>
      <ReviewRating
        reviewStarClassName={css.reviewStar}
        className={css.reviewStars}
        rating={rating}
      />
    </div>
  );
};

Review.propTypes = {
  content: string.isRequired,
  rating: number.isRequired,
};

// Check if a transition is the kind that
// should be rendered in he ActivityFeed
const shouldRenderTransition = transition => {
  return [
    propTypes.TX_TRANSITION_PREAUTHORIZE,
    propTypes.TX_TRANSITION_PREAUTHORIZE_ENQUIRY,
    propTypes.TX_TRANSITION_ACCEPT,
    propTypes.TX_TRANSITION_DECLINE,
    propTypes.TX_TRANSITION_AUTO_DECLINE,
    propTypes.TX_TRANSITION_CANCEL,
    propTypes.TX_TRANSITION_MARK_DELIVERED,
    propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_FIRST,
    propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_SECOND,
    propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_FIRST,
    propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_SECOND,
  ].includes(transition);
};

// Check if a user giving a review is related to
// given tx transition.
const isReviewTransition = transition => {
  return [
    propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_FIRST,
    propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_FIRST,
    propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_SECOND,
    propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_SECOND,
  ].includes(transition);
};

const hasUserLeftAReviewFirst = (userRole, lastTransition) => {
  return (
    (lastTransition === propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_FIRST &&
      userRole === propTypes.TX_TRANSITION_ACTOR_CUSTOMER) ||
    (lastTransition === propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_FIRST &&
      userRole === propTypes.TX_TRANSITION_ACTOR_PROVIDER) ||
    propTypes.areReviewsCompleted(lastTransition)
  );
};

const resolveTransitionMessage = (
  transition,
  lastTransition,
  listingTitle,
  ownRole,
  otherUsersName,
  intl,
  onOpenReviewModal
) => {
  const isOwnTransition = transition.by === ownRole;
  const currentTransition = transition.transition;
  const displayName = otherUsersName;
  const deliveredState = lastTransition === propTypes.TX_TRANSITION_MARK_DELIVERED;

  switch (currentTransition) {
    case propTypes.TX_TRANSITION_PREAUTHORIZE:
    case propTypes.TX_TRANSITION_PREAUTHORIZE_ENQUIRY:
      return isOwnTransition ? (
        <FormattedMessage id="ActivityFeed.ownTransitionRequest" values={{ listingTitle }} />
      ) : (
        <FormattedMessage
          id="ActivityFeed.transitionRequest"
          values={{ displayName, listingTitle }}
        />
      );
    case propTypes.TX_TRANSITION_ACCEPT:
      return isOwnTransition ? (
        <FormattedMessage id="ActivityFeed.ownTransitionAccept" />
      ) : (
        <FormattedMessage id="ActivityFeed.transitionAccept" values={{ displayName }} />
      );
    case propTypes.TX_TRANSITION_DECLINE:
      return isOwnTransition ? (
        <FormattedMessage id="ActivityFeed.ownTransitionDecline" />
      ) : (
        <FormattedMessage id="ActivityFeed.transitionDecline" />
      );
    case propTypes.TX_TRANSITION_AUTO_DECLINE:
      return ownRole === propTypes.TX_TRANSITION_ACTOR_PROVIDER ? (
        <FormattedMessage id="ActivityFeed.ownTransitionAutoDecline" />
      ) : (
        <FormattedMessage id="ActivityFeed.transitionAutoDecline" values={{ displayName }} />
      );
    case propTypes.TX_TRANSITION_CANCEL:
      return <FormattedMessage id="ActivityFeed.transitionCancel" />;
    case propTypes.TX_TRANSITION_MARK_DELIVERED:
      // Show the leave a review link if the state is delivered or
      // if current user is not the first to leave a review
      const reviewLink =
        deliveredState || !hasUserLeftAReviewFirst(ownRole, lastTransition) ? (
          <InlineTextButton onClick={onOpenReviewModal}>
            <FormattedMessage id="ActivityFeed.leaveAReview" values={{ displayName }} />
          </InlineTextButton>
        ) : null;

      return <FormattedMessage id="ActivityFeed.transitionComplete" values={{ reviewLink }} />;
    case propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_FIRST:
    case propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_FIRST:
      if (isOwnTransition) {
        return <FormattedMessage id="ActivityFeed.ownTransitionReview" values={{ displayName }} />;
      } else {
        // show the leave a review link if current user is not the first
        // one to leave a review
        const reviewLink = !hasUserLeftAReviewFirst(ownRole, lastTransition) ? (
          <InlineTextButton onClick={onOpenReviewModal}>
            <FormattedMessage id="ActivityFeed.leaveAReviewSecond" values={{ displayName }} />
          </InlineTextButton>
        ) : null;
        return (
          <FormattedMessage
            id="ActivityFeed.transitionReview"
            values={{ displayName, reviewLink }}
          />
        );
      }
    case propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_SECOND:
    case propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_SECOND:
      if (isOwnTransition) {
        return <FormattedMessage id="ActivityFeed.ownTransitionReview" values={{ displayName }} />;
      } else {
        return (
          <FormattedMessage
            id="ActivityFeed.transitionReview"
            values={{ displayName, reviewLink: null }}
          />
        );
      }

    default:
      log.error(new Error('Unknown transaction transition type'), 'unknown-transition-type', {
        transitionType: currentTransition,
      });
      return '';
  }
};

const reviewByAuthorId = (transaction, userId) => {
  return transaction.reviews.filter(r => r.author.id.uuid === userId.uuid)[0];
};

const Transition = props => {
  const { transition, transaction, currentUser, intl, onOpenReviewModal } = props;

  const currentTransaction = ensureTransaction(transaction);
  const customer = currentTransaction.customer;
  const provider = currentTransaction.provider;
  const listingTitle = currentTransaction.listing.attributes.title;
  const lastTransition = currentTransaction.attributes.lastTransition;

  const ownRole =
    currentUser.id.uuid === customer.id.uuid
      ? propTypes.TX_TRANSITION_ACTOR_CUSTOMER
      : propTypes.TX_TRANSITION_ACTOR_PROVIDER;

  const otherUsersName =
    ownRole === propTypes.TX_TRANSITION_ACTOR_CUSTOMER
      ? provider.attributes.profile.displayName
      : customer.attributes.profile.displayName;

  const transitionMessage = resolveTransitionMessage(
    transition,
    lastTransition,
    listingTitle,
    ownRole,
    otherUsersName,
    intl,
    onOpenReviewModal
  );
  const currentTransition = transition.transition;

  let reviewComponent = null;

  if (isReviewTransition(currentTransition) && propTypes.areReviewsCompleted(lastTransition)) {
    const customerReview =
      currentTransition === propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_FIRST ||
      currentTransition === propTypes.TX_TRANSITION_REVIEW_BY_CUSTOMER_SECOND;
    const providerReview =
      currentTransition === propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_FIRST ||
      currentTransition === propTypes.TX_TRANSITION_REVIEW_BY_PROVIDER_SECOND;
    if (customerReview) {
      const review = reviewByAuthorId(currentTransaction, customer.id);
      reviewComponent = (
        <Review content={review.attributes.content} rating={review.attributes.rating} />
      );
    } else if (providerReview) {
      const review = reviewByAuthorId(currentTransaction, provider.id);
      reviewComponent = (
        <Review content={review.attributes.content} rating={review.attributes.rating} />
      );
    }
  }

  const todayString = intl.formatMessage({ id: 'ActivityFeed.today' });

  return (
    <div className={css.transition}>
      <div className={css.bullet}>
        <p className={css.transitionContent}>•</p>
      </div>
      <div>
        <p className={css.transitionContent}>{transitionMessage}</p>
        <p className={css.transitionDate}>{formatDate(intl, todayString, transition.at)}</p>
        {reviewComponent}
      </div>
    </div>
  );
};

Transition.propTypes = {
  transition: propTypes.txTransition.isRequired,
  transaction: propTypes.transaction.isRequired,
  currentUser: propTypes.currentUser.isRequired,
  intl: intlShape.isRequired,
  onOpenReviewModal: func.isRequired,
};

const EmptyTransition = () => {
  return (
    <div className={css.transition}>
      <div className={css.bullet}>
        <p className={css.transitionContent}>•</p>
      </div>
      <div>
        <p className={css.transitionContent} />
        <p className={css.transitionDate} />
      </div>
    </div>
  );
};

const isMessage = item => item && item.type === 'message';

// Compare function for sorting an array containint messages and transitions
const compareItems = (a, b) => {
  const itemDate = item => (isMessage(item) ? item.attributes.at : item.at);
  return itemDate(a) - itemDate(b);
};

const organizedItems = (messages, transitions, hideOldTransitions) => {
  const items = messages.concat(transitions).sort(compareItems);
  if (hideOldTransitions) {
    // Hide transitions that happened before the oldest message. Since
    // we have older items (messages) that we are not showing, seeing
    // old transitions would be confusing.
    return dropWhile(items, i => !isMessage(i));
  } else {
    return items;
  }
};

export const ActivityFeedComponent = props => {
  const {
    rootClassName,
    className,
    messages,
    transaction,
    currentUser,
    hasOlderMessages,
    onOpenReviewModal,
    onShowOlderMessages,
    fetchMessagesInProgress,
    intl,
  } = props;
  const classes = classNames(rootClassName || css.root, className);

  const currentTransaction = ensureTransaction(transaction);
  const transitions = currentTransaction.attributes.transitions
    ? currentTransaction.attributes.transitions
    : [];
  const currentCustomer = ensureUser(currentTransaction.customer);
  const currentProvider = ensureUser(currentTransaction.provider);
  const currentListing = ensureListing(currentTransaction.listing);

  const transitionsAvailable = !!(
    currentUser &&
    currentUser.id &&
    currentCustomer.id &&
    currentProvider.id &&
    currentListing.id
  );

  // combine messages and transaction transitions
  const items = organizedItems(messages, transitions, hasOlderMessages || fetchMessagesInProgress);

  const transitionComponent = transition => {
    if (transitionsAvailable) {
      return (
        <Transition
          transition={transition}
          transaction={transaction}
          currentUser={currentUser}
          intl={intl}
          onOpenReviewModal={onOpenReviewModal}
        />
      );
    } else {
      return <EmptyTransition />;
    }
  };

  const messageComponent = message => {
    const isOwnMessage =
      message.sender &&
      message.sender.id &&
      currentUser &&
      currentUser.id &&
      message.sender.id.uuid === currentUser.id.uuid;
    if (isOwnMessage) {
      return <OwnMessage message={message} intl={intl} />;
    }
    return <Message message={message} intl={intl} />;
  };

  const messageListItem = message => {
    return (
      <li id={`msg-${message.id.uuid}`} key={message.id.uuid} className={css.messageItem}>
        {messageComponent(message)}
      </li>
    );
  };

  const transitionListItem = transition => {
    if (shouldRenderTransition(transition.transition)) {
      return (
        <li key={transition.transition} className={css.transitionItem}>
          {transitionComponent(transition)}
        </li>
      );
    } else {
      return null;
    }
  };

  return (
    <ul className={classes}>
      {hasOlderMessages ? (
        <li className={css.showOlderWrapper} key="show-older-messages">
          <InlineTextButton className={css.showOlderButton} onClick={onShowOlderMessages}>
            <FormattedMessage id="ActivityFeed.showOlderMessages" />
          </InlineTextButton>
        </li>
      ) : null}
      {items.map(item => {
        if (isMessage(item)) {
          return messageListItem(item);
        } else {
          return transitionListItem(item);
        }
      })}
    </ul>
  );
};

ActivityFeedComponent.defaultProps = {
  rootClassName: null,
  className: null,
};

ActivityFeedComponent.propTypes = {
  rootClassName: string,
  className: string,

  currentUser: propTypes.currentUser,
  transaction: propTypes.transaction,
  messages: arrayOf(propTypes.message),
  hasOlderMessages: bool.isRequired,
  onOpenReviewModal: func.isRequired,
  onShowOlderMessages: func.isRequired,
  fetchMessagesInProgress: bool.isRequired,

  // from injectIntl
  intl: intlShape.isRequired,
};

const ActivityFeed = injectIntl(ActivityFeedComponent);

export default ActivityFeed;