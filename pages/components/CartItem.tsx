function CartItem(props) {
  console.log('CART ITEM PROPS: ', props);
  return (
    <div className="border border-red-400 py-2 px-4 flex justify-around items-center rounded m-2 cursor-pointer">
      {props?.data?.name || 'Item Name'}
    </div>
  );
}

export default CartItem;